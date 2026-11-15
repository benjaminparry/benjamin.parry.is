// Pictures for posts: a hero image, a feed image, social images, and supporting images for the body of a post
// (one at a time with {% figure %}, or all together with {% gallery %}). See docs/post-images.md.
//
// This file has no Eleventy code in it except `addImages` at the bottom, so it can be tested on its own.
// It reads each image's size from the file itself, so a post only needs the address of the picture. The size
// gives every <img> a width and height (unless you turn that off in `settings` below) and the orientation class:
// landscape, portrait or square.

import { readFileSync, openSync, readSync, closeSync, statSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";

// ---- settings ----

// The one place to change how pictures are written out. Can also be set from the config:
//   addImages(eleventyConfig, { sizeAttributes: false });
export const settings = {
  // true: every <img> gets width="" and height="" (the page doesn't jump about as pictures load).
  // false: leave them off. The orientation class is still added, because it comes from the file, not from these.
  sizeAttributes: false,
};

// width="800" height="600" (with a leading space), or nothing when the setting is off or the size is unknown
const sizeAttributes = (image) =>
  settings.sizeAttributes && image?.width && image?.height ? ` width="${image.width}" height="${image.height}"` : "";

// ---- reading an image's size from its first bytes ----

const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

// Phones save a photo sideways and add a note saying "turn it": EXIF orientation 5 to 8 means the picture shows
// up with width and height swapped. Browsers follow the note, so this does too.
function exifSwaps(jpeg) {
  let i = 2;
  while (i + 4 < jpeg.length) {
    if (jpeg[i] !== 0xff) { i++; continue; }
    const marker = jpeg[i + 1];
    if (marker === 0xff) { i++; continue; }
    const length = jpeg.readUInt16BE(i + 2);
    if (marker === 0xe1 && jpeg.toString("latin1", i + 4, i + 10) === "Exif\0\0") {
      const tiff = i + 10;
      const little = jpeg.toString("latin1", tiff, tiff + 2) === "II";
      const u16 = (at) => (little ? jpeg.readUInt16LE(at) : jpeg.readUInt16BE(at));
      const u32 = (at) => (little ? jpeg.readUInt32LE(at) : jpeg.readUInt32BE(at));
      const ifd = tiff + u32(tiff + 4);
      if (ifd + 2 > jpeg.length) return false;
      const entries = u16(ifd);
      for (let n = 0; n < entries; n++) {
        const at = ifd + 2 + n * 12;
        if (at + 12 > jpeg.length) break;
        if (u16(at) === 0x0112) return u16(at + 8) >= 5 && u16(at + 8) <= 8;
      }
      return false;
    }
    if (marker === 0xda) break;                      // start of the picture data: no EXIF after this
    i += 2 + length;
  }
  return false;
}

export function imageSize(buffer, extension = "") {
  const b = buffer;
  const ext = String(extension).toLowerCase().replace(".", "");
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.length > 10 && b.toString("latin1", 0, 4) === "GIF8") return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xff) { i++; continue; }
      if (SOF.has(marker)) {
        const size = { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
        return exifSwaps(b) ? { width: size.height, height: size.width } : size;
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
    return undefined;
  }
  if (b.length > 30 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") {
    const kind = b.toString("latin1", 12, 16);
    if (kind === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (kind === "VP8L") { const bits = b.readUInt32LE(21); return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }; }
    if (kind === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    return undefined;
  }
  if (b.length > 12 && b.toString("latin1", 4, 8) === "ftyp") {                    // AVIF
    const ispe = b.indexOf("ispe", 0, "latin1");
    if (ispe < 0) return undefined;
    const size = { width: b.readUInt32BE(ispe + 8), height: b.readUInt32BE(ispe + 12) };
    const irot = b.indexOf("irot", 0, "latin1");
    return irot > 0 && (b[irot + 4] & 3) % 2 === 1 ? { width: size.height, height: size.width } : size;
  }
  if (ext === "svg" || b.toString("utf8", 0, 512).includes("<svg")) {
    const text = b.toString("utf8");
    const tag = text.match(/<svg\b[^>]*>/i)?.[0] ?? "";
    const num = (name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*["']\\s*([\\d.]+)\\s*(?:px)?\\s*["']`, "i")); return m ? parseFloat(m[1]) : undefined; };
    let width = num("width"), height = num("height");
    if (!width || !height) {
      const box = tag.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
      if (box) { width = parseFloat(box[1]); height = parseFloat(box[2]); }
    }
    return width && height ? { width: Math.round(width), height: Math.round(height) } : undefined;
  }
  return undefined;
}

// Only the start of the file is needed. 1 MB is plenty even for a photo with a big embedded preview.
const sizeCache = new Map();
export function sizeOfFile(path) {
  try {
    const { mtimeMs } = statSync(path);
    const cached = sizeCache.get(path);
    if (cached && cached.mtimeMs === mtimeMs) return cached.size;
    const fd = openSync(path, "r");
    const buffer = Buffer.alloc(1024 * 1024);
    const read = readSync(fd, buffer, 0, buffer.length, 0);
    closeSync(fd);
    const size = imageSize(buffer.subarray(0, read), extname(path));
    sizeCache.set(path, { mtimeMs, size });
    return size;
  } catch {
    return undefined;
  }
}

// ---- describing one picture ----

const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", avif: "image/avif", svg: "image/svg+xml" };
const escape = (text) => String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (text) => String(text).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const isRemote = (src) => /^https?:\/\//i.test(src);
const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return String(url); } };

// landscape, portrait or square. Within 5% either way counts as square.
export function orientationOf(width, height, tolerance = 0.05) {
  if (!width || !height) return undefined;
  if (Math.abs(width - height) / Math.max(width, height) <= tolerance) return "square";
  return width > height ? "landscape" : "portrait";
}

// A picture in the front matter is either just an address, or an object:
//   src (required)  alt  caption  source (a web address) sourceLabel  decorative: true  id  width  height
export function describeImage(spec, { root = "source", siteUrl = "", problems = [], where = "image" } = {}) {
  if (spec === undefined || spec === null || spec === false) return undefined;
  const given = typeof spec === "string" ? { src: spec } : { ...spec };
  if (!given.src) { problems.push(`${where}: no src`); return undefined; }
  const src = String(given.src);
  const extension = extname(src.split("?")[0]).slice(1).toLowerCase();

  let { width, height } = given;
  let found = true;
  if (!isRemote(src) && (!width || !height)) {
    const path = join(root, decodeURI(src));
    if (!existsSync(path)) { problems.push(`${where}: no file at ${path}`); found = false; }
    else {
      const size = sizeOfFile(path);
      if (size) ({ width, height } = size);
      else problems.push(`${where}: couldn't read the size of ${src}. Add width and height to it`);
    }
  } else if (isRemote(src) && (!width || !height)) {
    problems.push(`${where}: ${src} is on another site, so add its width and height to get the right orientation`);
  }

  const orientation = orientationOf(width, height);
  return {
    src,
    abs: isRemote(src) ? src : `${siteUrl}${src.startsWith("/") ? "" : "/"}${src}`,
    alt: given.decorative ? "" : given.alt ?? "",
    hasAlt: Boolean(given.decorative) || (given.alt !== undefined && given.alt !== null && String(given.alt).trim() !== ""),
    decorative: Boolean(given.decorative),
    caption: given.caption ?? "",
    source: given.source ?? "",
    sourceLabel: given.sourceLabel ?? (given.source ? hostOf(given.source) : ""),
    id: given.id ? String(given.id) : slug(basename(src.split("?")[0], extname(src.split("?")[0]))),
    gallery: given.gallery !== false,
    width,
    height,
    orientation,
    sizeAttrs: sizeAttributes({ width, height }),      // for templates: {{ image.sizeAttrs | safe }}
    type: MIME[extension],
    found,
  };
}

// ---- everything a post has ----

// `data` is the post's data (front matter plus everything inherited). Front matter looks like:
//
//   pictures:
//     hero:     { src, alt, caption, source }
//     feed:     { src }
//     social:   [ { src, alt }, ... ]
//     images:   [ { id, src, alt, caption, source }, ... ]
//     gallery:  true          (put all of `images` after the post)
//
// A post that only has the older `images:` list keeps working: the first one is its feed image.
export function resolveMedia(data = {}, { root = "source", warn = (message) => console.warn(message) } = {}) {
  const media = data.pictures && typeof data.pictures === "object" && !Array.isArray(data.pictures) ? data.pictures : {};
  const legacy = Array.isArray(data.images) ? data.images : [];
  if (!Object.keys(media).length && !legacy.length) return undefined;

  const siteUrl = data.site?.url ?? "";
  const problems = [];
  const make = (spec, where) => describeImage(spec, { root, siteUrl, problems, where });

  const hero = make(media.hero, "hero");
  if (hero && !hero.hasAlt) problems.push(`hero: add alt text, or decorative: true if it adds nothing`);

  const feed = make(media.feed ?? legacy[0], "feed image");

  const used = new Set();
  const images = [].concat(media.images ?? []).map((spec, i) => {
    const image = make(spec, `images[${i}]`);
    if (!image) return undefined;
    let id = image.id, n = 2;
    while (used.has(id)) id = `${image.id}-${n++}`;
    used.add(id);
    image.id = id;
    if (!image.hasAlt) problems.push(`images[${i}] (${id}): add alt text, or decorative: true if it adds nothing`);
    if (!image.orientation && image.found) problems.push(`images[${i}] (${id}): orientation unknown`);
    return image;
  }).filter(Boolean);

  const explicit = [].concat(media.social ?? []).map((spec, i) => {
    const image = make(spec, `social[${i}]`);
    if (image && !image.hasAlt) problems.push(`social[${i}]: add alt text (it is read out by social sites)`);
    if (image?.width && image.width < 600) problems.push(`social[${i}]: only ${image.width}px wide. Most sites want at least 1200 × 630`);
    return image;
  }).filter(Boolean);
  // with none given, share the hero, then the feed image
  const fallback = explicit.length ? undefined : hero ?? feed;
  const social = explicit.length ? explicit : fallback ? [fallback] : [];

  const set = {
    hero, feed, social, socialFromFallback: !explicit.length && social.length > 0,
    images, byId: Object.fromEntries(images.map((image) => [image.id, image])),
    gallery: media.gallery === true,
    problems,
  };
  const where = data.page?.inputPath ?? "a post";
  for (const problem of problems) warn(`[media] ${where}: ${problem}`);
  return set;
}

// ---- HTML ----

function captionHtml(image) {
  const source = image.source
    ? `<span class="post-image__source">Source: <a href="${escape(image.source)}" rel="noopener">${escape(image.sourceLabel)}</a></span>`
    : "";
  if (!image.caption && !source) return "";
  return `<figcaption>${image.caption ? escape(image.caption) : ""}${image.caption && source ? " " : ""}${source}</figcaption>`;
}

function imgHtml(image, extra = "") {
  return `<img src="${escape(image.src)}" alt="${escape(image.alt)}"${sizeAttributes(image)}${extra}>`;
}

// One picture with its caption and source. No blank lines in what it gives back, so it can sit in a Markdown post.
export function figureHtml(image, { hero = false } = {}) {
  if (!image) return "";
  const classes = ["post-image", image.orientation ? `post-image--${image.orientation}` : "", hero ? "post-hero" : ""].filter(Boolean).join(" ");
  const id = !hero && image.id ? ` id="figure-${escape(image.id)}"` : "";
  const img = hero ? imgHtml(image, ' class="u-photo" fetchpriority="high" decoding="async"') : imgHtml(image, ' loading="lazy" decoding="async"');
  return `<figure class="${classes}"${id}>${img}${captionHtml(image)}</figure>`;
}

// Pictures in a grid. It needs no JavaScript: each picture is a link to the full-size file.
export function galleryHtml(images = [], { label = "Image gallery" } = {}) {
  if (!images.length) return "";
  const items = images.map((image) => {
    const name = image.alt || image.caption || image.id;
    const classes = ["post-image", image.orientation ? `post-image--${image.orientation}` : ""].filter(Boolean).join(" ");
    return `<li class="post-gallery__item"><figure class="${classes}"><a class="post-gallery__link" href="${escape(image.src)}"><span class="off-screen">View full size: ${image.alt ? "" : escape(name)}</span>${imgHtml(image, ' loading="lazy" decoding="async"')}</a>${captionHtml(image)}</figure></li>`;
  });
  return `<section class="post-gallery" aria-label="${escape(label)}"><ul class="post-gallery__list" role="list">${items.join("")}</ul></section>`;
}

// For the Atom feed: the feed image at the top of an entry
export function feedImageHtml(feed) {
  if (!feed) return "";
  return `<p><img src="${escape(feed.abs)}" alt="${escape(feed.alt)}"${sizeAttributes(feed)}></p>`;
}

// Finds a picture by name: one of pictures.images, or the reserved names "hero" and "feed" (a real id of the same name wins)
export const findImage = (set, id) => set?.byId?.[id] ?? (id === "hero" || id === "feed" ? set?.[id] : undefined);

// ---- Eleventy ----

export function addImages(eleventyConfig, options = {}) {
  Object.assign(settings, options);
  // {% figure "id" %}   one of the post's `pictures.images`
  // {% figure "hero" %}, {% figure "feed" %}   the post's hero or feed picture again, with its own alt text, caption and source
  // {% figure { src: "/assets/images/x.jpg", alt: "..." } %}   or one written out right here
  eleventyConfig.addShortcode("figure", function (target, mediaSet) {
    const set = mediaSet ?? this?.ctx?.mediaSet ?? this?.page?.mediaSet;
    const where = this?.page?.inputPath ?? "a post";
    if (target && typeof target === "object") {
      const problems = [];
      const image = describeImage(target, { problems, where: "figure", siteUrl: this?.ctx?.site?.url ?? "" });
      for (const p of problems) console.warn(`[media] ${where}: ${p}`);
      if (image && !image.hasAlt) console.warn(`[media] ${where}: figure ${image.src} has no alt text`);
      return figureHtml(image);
    }
    const image = findImage(set, target);
    if (!image) {
      console.warn(`[media] ${where}: {% figure "${target}" %} has no matching image in pictures.images (or pictures.hero / pictures.feed)${set ? "" : " (no image data for this page; pass it in: {% figure \"" + target + "\", mediaSet %})"}`);
      return `<!-- no image "${escape(target)}" -->`;
    }
    return figureHtml(image);
  });

  // {% gallery %}   every image in `pictures.images`
  // {% gallery "one", "two" %}   just these, in this order
  // {% gallery %}   all of the post's supporting images (those not marked gallery: false)
  // {% gallery "a", "b" %}   just those, in that order
  // {% gallery "a", "b", mediaSet %}   the same, passing the post's data in by hand if the shortcode can't see it
  eleventyConfig.addShortcode("gallery", function (...args) {
    const given = args.length && args[args.length - 1] && typeof args[args.length - 1] === "object" ? args[args.length - 1] : undefined;
    // Nunjucks hands a bare {% gallery %} one empty string, so ignore anything that isn't a name
    const ids = (given ? args.slice(0, -1) : args).filter((id) => typeof id === "string" ? id.trim() !== "" : id != null);
    const set = given ?? this?.ctx?.mediaSet ?? this?.page?.mediaSet;
    const where = this?.page?.inputPath ?? "a post";
    if (!set) { console.warn(`[media] ${where}: {% gallery %} has no image data for this page`); return "<!-- no gallery -->"; }
    const chosen = ids.length ? ids.map((id) => findImage(set, id) ?? console.warn(`[media] ${where}: gallery: no image "${id}"`)).filter(Boolean) : set.images.filter((i) => i.gallery);
    return galleryHtml(chosen);
  });

  // For templates: {{ image | figure }} and the hero and gallery partials
  eleventyConfig.addFilter("figureHtml", (image, options) => figureHtml(image, options));
  eleventyConfig.addFilter("galleryHtml", (images, options) => galleryHtml(images, options));
}
