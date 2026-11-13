// node scripts/images-test.mjs   (checks _config/images.js against the small pictures in scripts/fixtures)
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { imageSize, sizeOfFile, orientationOf, describeImage, resolveMedia, figureHtml, galleryHtml, feedImageHtml, addImages } from "../_config/images.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "fixtures");
const dir = join(root, "assets/images");
let n = 0, bad = 0;
const eq = (a, b, m) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.log("FAIL", m, "\n got ", JSON.stringify(a), "\n want", JSON.stringify(b)); } };
const has = (s, part, m) => { n++; if (!String(s).includes(part)) { bad++; console.log("FAIL", m, "\n missing", part, "\n in", s); } };
const lacks = (s, part, m) => { n++; if (String(s).includes(part)) { bad++; console.log("FAIL", m, "\n should not contain", part, "\n in", s); } };

// ---- reading sizes ----
const size = (name) => sizeOfFile(join(dir, name));
eq(size("landscape.jpg"), { width: 800, height: 600 }, "jpeg");
eq(size("progressive.jpg"), { width: 800, height: 600 }, "progressive jpeg");
eq(size("phone-portrait.jpg"), { width: 600, height: 800 }, "phone photo with EXIF 'rotate 90' shows swapped");
eq(size("phone-normal.jpg"), { width: 800, height: 600 }, "EXIF orientation 1 changes nothing");
eq(size("portrait.png"), { width: 300, height: 500 }, "png");
eq(size("square.gif"), { width: 400, height: 400 }, "gif");
eq(size("wide.webp"), { width: 640, height: 360 }, "webp lossy");
eq(size("lossless.webp"), { width: 200, height: 300 }, "webp lossless");
if (existsSync(join(dir, "wide.avif"))) eq(size("wide.avif"), { width: 500, height: 250 }, "avif");
eq(size("vector.svg"), { width: 120, height: 40 }, "svg viewBox");
eq(size("vector-sized.svg"), { width: 64, height: 96 }, "svg width and height");
eq(imageSize(Buffer.from("not an image")), undefined, "not an image");
eq(sizeOfFile(join(dir, "missing.jpg")), undefined, "missing file");

eq([orientationOf(800, 600), orientationOf(600, 800), orientationOf(400, 400), orientationOf(410, 400), orientationOf(0, 0)], ["landscape", "portrait", "square", "square", undefined], "orientation, 5% counts as square");

// ---- describing one picture ----
const problems = [];
let img = describeImage({ src: "/assets/images/landscape.jpg", alt: "A red box", caption: "Red", source: "https://www.example.com/page" }, { root, siteUrl: "https://site.test", problems });
eq([img.width, img.height, img.orientation, img.type, img.id], [800, 600, "landscape", "image/jpeg", "landscape"], "size, orientation, type and id");
eq([img.abs, img.sourceLabel, img.hasAlt], ["https://site.test/assets/images/landscape.jpg", "example.com", true], "absolute url, source label from the host");
eq(describeImage("/assets/images/portrait.png", { root, problems }).orientation, "portrait", "a bare address works");
img = describeImage({ src: "/assets/images/nope.jpg" }, { root, problems, where: "hero" });
ok(problems.some((p) => p.includes("hero: no file at")), "missing file reported");
function ok(c, m) { n++; if (!c) { bad++; console.log("FAIL", m); } }
eq(describeImage({ src: "/assets/images/landscape.jpg", decorative: true, alt: "ignored" }, { root }).alt, "", "decorative: alt is empty");
eq(describeImage({ src: "https://elsewhere.test/x.jpg", width: 300, height: 600 }, { root }).orientation, "portrait", "remote image with its size given");
const remote = []; describeImage({ src: "https://elsewhere.test/x.jpg" }, { root, problems: remote });
ok(remote.length === 1, "remote image without a size is flagged");

// ---- everything a post has ----
const warnings = [];
const data = {
  site: { url: "https://site.test" },
  page: { inputPath: "./source/writing/a-post.md" },
  media: {
    hero: { src: "/assets/images/wide.webp", alt: "A teal banner", caption: "The banner", source: "https://example.com/banner" },
    feed: "/assets/images/square.gif",
    images: [
      { src: "/assets/images/landscape.jpg", alt: "Red" },
      { id: "phone", src: "/assets/images/phone-portrait.jpg", alt: "A phone photo", caption: "Taken on a phone" },
      { src: "/assets/images/landscape.jpg", decorative: true },
      { src: "/assets/images/portrait.png" },
    ],
  },
};
let set = resolveMedia(data, { root, warn: (m) => warnings.push(m) });
eq(set.hero.orientation, "landscape", "hero orientation");
eq(set.images.map((i) => i.id), ["landscape", "phone", "landscape-2", "portrait"], "ids from file names, unique");
eq(set.byId.phone.orientation, "portrait", "EXIF-rotated photo is portrait");
eq(set.social.map((s) => s.src), ["/assets/images/wide.webp"], "no social images: share the hero");
eq(set.socialFromFallback, true, "and says it is a fallback");
eq(set.feed.src, "/assets/images/square.gif", "feed image");
ok(warnings.length === 1 && warnings[0].includes("images[3] (portrait): add alt text") && warnings[0].includes("a-post.md"), "one warning: the picture with no alt text, naming the post");

data.media.social = [{ src: "/assets/images/landscape.jpg", alt: "Share one" }, { src: "/assets/images/wide.webp", alt: "Share two" }];
set = resolveMedia(data, { root, warn: () => {} });
eq(set.social.length, 2, "two social images");
const small = resolveMedia({ ...data, media: { social: [{ src: "/assets/images/square.gif", alt: "tiny" }] } }, { root, warn: () => {} });
ok(small.problems.some((p) => p.includes("only 400px wide")), "a small social image is flagged");
ok(!set.problems.some((p) => p.includes("only")), "big enough ones are not");

// old posts with only `images:` keep working
const oldStyle = resolveMedia({ images: ["/assets/images/landscape.jpg"], site: { url: "https://site.test" } }, { root, warn: () => {} });
eq([oldStyle.feed.src, oldStyle.hero, oldStyle.images.length, oldStyle.social.length], ["/assets/images/landscape.jpg", undefined, 0, 1], "legacy images list becomes the feed image, and is shared if nothing else is");
eq(resolveMedia({}, { root }), undefined, "a post with no pictures has no media set");

// ---- HTML ----
const fig = figureHtml(set.byId.phone);
eq(fig, '<figure class="post-image post-image--portrait" id="figure-phone"><img src="/assets/images/phone-portrait.jpg" alt="A phone photo" width="600" height="800" loading="lazy" decoding="async"><figcaption>Taken on a phone</figcaption></figure>', "exact figure markup");
has(figureHtml({ ...set.byId.phone, alt: 'Say "hi" & <wave>' }), 'alt="Say &quot;hi&quot; &amp; &lt;wave&gt;"', "alt text is escaped");
has(figureHtml(set.hero, { hero: true }), 'class="post-image post-image--landscape post-hero"', "hero classes");
has(figureHtml(set.hero, { hero: true }), 'class="u-photo" fetchpriority="high"', "hero is a u-photo and high priority");
lacks(figureHtml(set.hero, { hero: true }), 'loading="lazy"', "hero is not lazy");
has(figureHtml(set.hero, { hero: true }), 'Source: <a href="https://example.com/banner" rel="noopener">example.com</a>', "source link");
lacks(figureHtml({ ...set.byId.phone, caption: "" }), "<figcaption", "no caption, no figcaption");
has(figureHtml({ ...set.byId.phone, caption: "", source: "https://a.test/x", sourceLabel: "a.test" }), "<figcaption><span", "source alone");
eq(figureHtml(undefined), "", "nothing to show");
ok(!/\n\s*\n/.test(figureHtml(set.hero)) && !figureHtml(set.hero).includes("\n"), "no line breaks at all, so Markdown can't split it");

const gal = galleryHtml(set.images);
has(gal, '<section class="post-gallery" aria-label="Image gallery"><ul class="post-gallery__list" role="list">', "gallery wrapper");
eq((gal.match(/<li /g) || []).length, 4, "four items");
has(gal, '<a class="post-gallery__link" href="/assets/images/phone-portrait.jpg"><span class="off-screen">View full size: </span><img', "link to the full file, hidden prefix");
has(gal, "View full size: landscape-2</span>", "decorative image still gets a link name");
eq(galleryHtml([]), "", "empty gallery");
lacks(gal, 'id="figure-', "gallery items don't repeat figure ids");

has(feedImageHtml(set.feed), '<p><img src="https://site.test/assets/images/square.gif" alt="" width="400" height="400"></p>', "feed image, absolute address");
eq(feedImageHtml(undefined), "", "no feed image");

// ---- the shortcodes ----
const shortcodes = {};
addImages({ addShortcode: (name, fn) => (shortcodes[name] = fn), addFilter: () => {} });
const withData = { ctx: { mediaSet: set }, page: { inputPath: "./x.md" } };
has(shortcodes.figure.call(withData, "phone"), 'id="figure-phone"', "{% figure \"phone\" %}");
has(shortcodes.figure.call({ page: {} }, "phone", set), 'id="figure-phone"', "or with the data passed in");
has(shortcodes.figure.call(withData, { src: "/assets/images/portrait.png", alt: "inline", width: 300, height: 500 }), 'alt="inline"', "an image written out in the shortcode");
const warned = []; const realWarn = console.warn; console.warn = (m) => warned.push(m);
has(shortcodes.figure.call(withData, "nope"), "<!-- no image", "unknown id: a comment, not a crash");
shortcodes.gallery.call({ page: {} });
console.warn = realWarn;
ok(warned.length === 2 && warned[0].includes('no matching image'), "and both say what went wrong");
eq((shortcodes.gallery.call(withData).match(/<li /g) || []).length, 4, "{% gallery %} shows all");
eq((shortcodes.gallery.call(withData, "phone", "landscape").match(/<li /g) || []).length, 2, "{% gallery \"phone\", \"landscape\" %} just those");
ok(shortcodes.gallery.call(withData, "phone", "landscape").indexOf("phone-portrait") < shortcodes.gallery.call(withData, "phone", "landscape").indexOf("landscape.jpg"), "in the order given");

console.log(`${n - bad} of ${n} passed`);
process.exit(bad ? 1 : 0);
