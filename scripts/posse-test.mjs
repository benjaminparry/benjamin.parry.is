import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashtag, hashtagsOf, tagFacets, wantedNetworks, unknownNetworks, networkOf, alreadyOn, posseItems, compose, mastodonLength, graphemes, linkFacets, escapeLinkedIn, shorten, addSyndication } from "../_config/posse.js";
import { postMastodon, postBluesky, postLinkedIn } from "../_config/posse-networks.js";
import { run } from "./posse.mjs";
import { authorizeUrl, expiryDate } from "./posse-linkedin-auth.mjs";

let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : (fail++, console.log("FAIL", name)); };
const eq = (name, a, b) => check(`${name} (got ${JSON.stringify(a)})`, JSON.stringify(a) === JSON.stringify(b));
const config = { feeds: ["feedable"], maxAgeDays: 7, language: "en",
  mastodon: { instance: "https://mastodon.social", limit: 500, visibility: "public" },
  bluesky: { service: "https://bsky.social", identifier: "me.bsky.social", limit: 300 },
  linkedin: { version: "202610", limit: 3000 } };

// ---- which networks ----
eq("true means all", wantedNetworks(true), ["mastodon", "bluesky", "linkedin"]);
eq("a list", wantedNetworks(["Mastodon", " bluesky "]), ["mastodon", "bluesky"]);
eq("a comma string", wantedNetworks("mastodon,linkedin"), ["mastodon", "linkedin"]);
eq("false and nothing mean none", [wantedNetworks(false), wantedNetworks(undefined)], [[], []]);
eq("unknown names are dropped", wantedNetworks(["mastodon", "twitter"]), ["mastodon"]);
eq("and reported", unknownNetworks(["mastodon", "Twitter"]), ["twitter"]);
eq("networkOf mastodon", networkOf("https://mastodon.social/@me/123", config), "mastodon");
eq("networkOf bluesky", networkOf("https://bsky.app/profile/me/post/abc", config), "bluesky");
eq("networkOf linkedin", networkOf("https://www.linkedin.com/feed/update/urn:li:share:1/", config), "linkedin");
eq("networkOf something else", networkOf("https://example.com/x", config), undefined);
check("alreadyOn finds it", alreadyOn(["https://mastodon.social/@me/1"], "mastodon", config));
check("alreadyOn handles a single string", alreadyOn("https://bsky.app/profile/x/post/y", "bluesky", config));
check("alreadyOn is false for another network", !alreadyOn(["https://mastodon.social/@me/1"], "bluesky", config));

// ---- the list of posts ----
const post = (url, data, date = "2026-11-16T10:00:00Z") => ({ url, date: new Date(date), inputPath: `./source${url}index.md`, data });
const list = posseItems({ feedable: [
  post("/a/", { title: "A", summary: "S", syndicate: true, mediaSet: { social: [], hero: { abs: "https://x/h.jpg", alt: "Hero", type: "image/jpeg" }, feed: { abs: "https://x/f.jpg", type: "image/jpeg" } } }),
  post("/b/", { title: "B", syndicate: ["bluesky", "twitter"], syndication: "https://mastodon.social/@me/1", syndicateText: "Hello" }, "2026-11-17T10:00:00Z"),
  post("/c/", { title: "C" }),
  post("/d/", { title: "D", syndicate: false }),
], writing: [post("/a/", { title: "dup", syndicate: true })] }, { feeds: ["feedable", "writing"] }, { url: "https://benjamin.parry.is" });
eq("only opted-in posts, once each", list.items.map((i) => i.url), ["https://benjamin.parry.is/b/", "https://benjamin.parry.is/a/"]);
eq("newest first", list.items[0].title, "B");
eq("hero is used when there is no social image", list.items[1].image, { url: "https://x/h.jpg", alt: "Hero", type: "image/jpeg" });
eq("unknown network is reported", list.items[0].unknown, ["twitter"]);
eq("a single syndication string becomes a list", list.items[0].syndication, ["https://mastodon.social/@me/1"]);
eq("syndicateText comes through", list.items[0].text, "Hello");
eq("the file is passed on for the write-back", list.items[1].file, "./source/a/index.md");

// ---- the words ----
const item = { title: "A title", summary: "A summary of the post.", url: "https://benjamin.parry.is/writing/2026/11/a-post/" };
eq("title, summary and link", compose(item, { limit: 500 }), "A title\n\nA summary of the post.\n\nhttps://benjamin.parry.is/writing/2026/11/a-post/");
eq("no summary", compose({ ...item, summary: "" }, { limit: 500 }), "A title\n\nhttps://benjamin.parry.is/writing/2026/11/a-post/");
eq("LinkedIn has no link in the words", compose(item, { limit: 3000, includeUrl: false }), "A title\n\nA summary of the post.");
eq("override text replaces title and summary", compose({ ...item, text: "Just this" }, { limit: 500 }), "Just this\n\nhttps://benjamin.parry.is/writing/2026/11/a-post/");
const long = { ...item, summary: "word ".repeat(200) };
const cut = compose(long, { limit: 300 });
check("a long summary is cut to fit Bluesky's 300", graphemes(cut) <= 300 && cut.endsWith(item.url) && cut.includes("…"));
check("the title stays whole", cut.startsWith("A title\n\n"));
const cutM = compose(long, { limit: 500, measure: mastodonLength });
check("Mastodon counts a link as 23", mastodonLength(`x ${item.url}`) === 2 + 23 && mastodonLength(cutM) <= 500 && cutM.endsWith(item.url));
check("Mastodon gets more words than Bluesky from the same limit idea", mastodonLength(compose(long, { limit: 300, measure: mastodonLength })) <= 300);
const emoji = compose({ ...item, summary: "🎌".repeat(400) }, { limit: 300 });
check("emoji are counted as one each and not split", graphemes(emoji) <= 300 && !emoji.includes("�"));
eq("shorten", shorten("abcdef", 4), "abc…");

// ---- Bluesky facets are in bytes ----
const withEmoji = "Café 🎌 post\n\nhttps://x.test/a/";
const [facet] = linkFacets(withEmoji, "https://x.test/a/");
const bytes = new TextEncoder().encode(withEmoji);
eq("facet covers exactly the link, in bytes", new TextDecoder().decode(bytes.slice(facet.index.byteStart, facet.index.byteEnd)), "https://x.test/a/");
eq("facet type", facet.features[0].$type, "app.bsky.richtext.facet#link");
eq("no link, no facet", linkFacets("nothing here", "https://x.test/"), []);

// ---- LinkedIn escaping ----
eq("reserved characters are escaped", escapeLinkedIn("A (test) #tag @me [x] *b* _i_ ~s~ {a|b} <c> \\"), "A \\(test\\) \\#tag \\@me \\[x\\] \\*b\\* \\_i\\_ \\~s\\~ \\{a\\|b\\} \\<c\\> \\\\");

// ---- front matter write-back ----
const fm = (extra = "") => `---\ntitle: "T"\n${extra}---\nBody\n`;
eq("adds the key when there is none", addSyndication(fm(), "https://m/1"), fm("syndication:\n  - https://m/1\n"));
eq("adds to a list", addSyndication(fm("syndication:\n  - https://a/1\npictures:\n  feed:\n    src: x\n"), "https://m/2"), fm("syndication:\n  - https://a/1\n  - https://m/2\npictures:\n  feed:\n    src: x\n"));
eq("turns a single string into a list", addSyndication(fm("syndication: https://a/1\n"), "https://m/2"), fm("syndication:\n  - https://a/1\n  - https://m/2\n"));
eq("turns an inline list into a block", addSyndication(fm("syndication: [https://a/1, https://a/2]\n"), "https://m/3"), fm("syndication:\n  - https://a/1\n  - https://a/2\n  - https://m/3\n"));
eq("keeps CRLF", addSyndication(fm().replace(/\n/g, "\r\n"), "https://m/1"), fm("syndication:\n  - https://m/1\n").replace(/\n/g, "\r\n"));
eq("no front matter, no change", addSyndication("Just text\n", "https://m/1"), undefined);
check("the body is untouched", addSyndication(fm(), "https://m/1").endsWith("---\nBody\n"));

// ---- the network calls, against a pretend internet ----
function fake(routes, seen = []) {
  const fn = async (url, options = {}) => {
    seen.push({ url: String(url), method: options.method ?? "GET", headers: options.headers ?? {}, body: options.body });
    const route = routes.find((r) => String(url).startsWith(r.at));
    if (!route) return new Response("no route", { status: 404 });
    const out = typeof route.reply === "function" ? route.reply(options) : route.reply;
    return new Response(out.body instanceof Uint8Array ? out.body : JSON.stringify(out.body ?? {}), { status: out.status ?? 200, headers: out.headers ?? {} });
  };
  fn.seen = seen;
  return fn;
}
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const picture = { url: "https://benjamin.parry.is/img/a.jpg", alt: "A", type: "image/jpeg" };

let f = fake([{ at: "https://mastodon.social/api/v1/statuses", reply: { body: { url: "https://mastodon.social/@me/777" } } }]);
let out = await postMastodon({ instance: "https://mastodon.social/", token: "TOKEN", text: "Hi", language: "en", key: "k1" }, f);
eq("Mastodon returns the post's address", out.url, "https://mastodon.social/@me/777");
eq("Mastodon is sent the token, JSON and an idempotency key", [f.seen[0].headers.Authorization, f.seen[0].headers["Idempotency-Key"], JSON.parse(f.seen[0].body)], ["Bearer TOKEN", "k1", { status: "Hi", visibility: "public", language: "en" }]);
f = fake([{ at: "https://mastodon.social/", reply: { status: 422, body: { error: "Validation failed" } } }]);
let message = ""; try { await postMastodon({ instance: "https://mastodon.social", token: "SECRET-TOKEN", text: "Hi" }, f); } catch (e) { message = e.message; }
check("a Mastodon error says what happened and doesn't leak the token", message.includes("422") && message.includes("Validation failed") && !message.includes("SECRET-TOKEN"));

const bsky = (extra = []) => fake([
  { at: "https://bsky.social/xrpc/com.atproto.server.createSession", reply: { body: { accessJwt: "JWT", did: "did:plc:abc", handle: "me.bsky.social" } } },
  { at: "https://benjamin.parry.is/img/a.jpg", reply: { body: jpg, headers: { "content-type": "image/jpeg" } } },
  { at: "https://bsky.social/xrpc/com.atproto.repo.uploadBlob", reply: { body: { blob: { $type: "blob", ref: { $link: "bafy" }, mimeType: "image/jpeg", size: 4 } } } },
  { at: "https://bsky.social/xrpc/com.atproto.repo.createRecord", reply: { body: { uri: "at://did:plc:abc/app.bsky.feed.post/3kabc", cid: "c" } } },
  ...extra,
]);
const text = "Café 🎌\n\nhttps://x.test/a/";
f = bsky();
out = await postBluesky({ identifier: "me.bsky.social", password: "PW", text, link: { url: "https://x.test/a/", title: "T", description: "D" }, image: picture, language: "en" }, f);
eq("Bluesky returns the web address", out.url, "https://bsky.app/profile/me.bsky.social/post/3kabc");
const made = JSON.parse(f.seen.find((c) => c.url.endsWith("createRecord")).body);
eq("record goes to the right repo and collection", [made.repo, made.collection, made.record.$type], ["did:plc:abc", "app.bsky.feed.post", "app.bsky.feed.post"]);
eq("link card has the page's title, description and thumbnail", [made.record.embed.$type, made.record.embed.external.title, made.record.embed.external.description, made.record.embed.external.thumb.ref.$link], ["app.bsky.embed.external", "T", "D", "bafy"]);
check("createdAt ends in Z", /Z$/.test(made.record.createdAt));
check("langs are set", made.record.langs[0] === "en");
check("the link facet is there", made.record.facets[0].features[0].uri === "https://x.test/a/");
check("the image is uploaded with its type and the session token", (() => { const u = f.seen.find((c) => c.url.endsWith("uploadBlob")); return u.headers["Content-Type"] === "image/jpeg" && u.headers.Authorization === "Bearer JWT"; })());
f = bsky([]);
const bigImage = fake([{ at: "https://bsky.social/xrpc/com.atproto.server.createSession", reply: { body: { accessJwt: "J", did: "d" } } }, { at: "https://benjamin.parry.is/", reply: { body: new Uint8Array(1_000_000), headers: { "content-type": "image/jpeg" } } }, { at: "https://bsky.social/xrpc/com.atproto.repo.createRecord", reply: { body: { uri: "at://d/app.bsky.feed.post/k" } } }]);
out = await postBluesky({ identifier: "x", password: "p", text: "t https://x.test/", link: { url: "https://x.test/", title: "T" }, image: picture }, bigImage);
check("an image over 1 MB is left off, the post still goes out", out.notes[0].includes("limit") && !JSON.parse(bigImage.seen.at(-1).body).record.embed.external.thumb);
check("and falls back to the DID when no handle", out.url === "https://bsky.app/profile/d/post/k");

const li = fake([
  { at: "https://benjamin.parry.is/img/a.jpg", reply: { body: jpg, headers: { "content-type": "image/jpeg" } } },
  { at: "https://api.linkedin.com/rest/images?action=initializeUpload", reply: { body: { value: { uploadUrl: "https://www.linkedin.com/dms-uploads/xyz", image: "urn:li:image:IMG1" } } } },
  { at: "https://www.linkedin.com/dms-uploads/xyz", reply: { status: 201 } },
  { at: "https://api.linkedin.com/rest/posts", reply: { status: 201, headers: { "x-restli-id": "urn:li:share:555" } } },
]);
out = await postLinkedIn({ token: "LT", author: "urn:li:person:abc", version: "202610", text: "Title (with) #bits", link: { url: "https://x.test/a/", title: "Title", description: "Desc" }, image: picture }, li);
eq("LinkedIn returns the post's address", out.url, "https://www.linkedin.com/feed/update/urn:li:share:555/");
const posted = li.seen.find((c) => c.url.endsWith("/rest/posts"));
const body = JSON.parse(posted.body);
eq("LinkedIn headers", [posted.headers["Linkedin-Version"], posted.headers["X-Restli-Protocol-Version"], posted.headers.Authorization], ["202610", "2.0.0", "Bearer LT"]);
eq("LinkedIn body (the words are escaped)", [body.author, body.visibility, body.lifecycleState, body.content.article.source, body.content.article.thumbnail, body.commentary], ["urn:li:person:abc", "PUBLIC", "PUBLISHED", "https://x.test/a/", "urn:li:image:IMG1", "Title \\(with\\) \\#bits"]);
check("LinkedIn picture was uploaded to the upload address", li.seen.some((c) => c.method === "PUT" && c.url === "https://www.linkedin.com/dms-uploads/xyz"));
const noWebp = fake([{ at: "https://api.linkedin.com/rest/posts", reply: { status: 201, headers: { "x-restli-id": "urn:li:share:1" } } }]);
out = await postLinkedIn({ token: "t", author: "a", text: "x", link: { url: "https://x.test/", title: "T" }, image: { ...picture, type: "image/webp" } }, noWebp);
check("a WebP picture is left off for LinkedIn and the post still goes", out.notes[0].includes("image/webp") && !JSON.parse(noWebp.seen.at(-1).body).content.article.thumbnail);
const liFail = fake([{ at: "https://benjamin.parry.is/", reply: { body: jpg } }, { at: "https://api.linkedin.com/rest/images", reply: { status: 403, body: { message: "no" } } }, { at: "https://api.linkedin.com/rest/posts", reply: { status: 201, headers: { "x-restli-id": "urn:li:share:2" } } }]);
out = await postLinkedIn({ token: "t", author: "a", text: "x", link: { url: "https://x.test/", title: "T" }, image: picture }, liFail);
check("if the picture upload fails the post still goes, with a note", out.url.endsWith("urn:li:share:2/") && out.notes[0].includes("403"));

// ---- the whole run ----
const root = mkdtempSync(join(tmpdir(), "posse-"));
const write = (name, body) => { mkdirSync(join(root, "source", name), { recursive: true }); writeFileSync(join(root, "source", name, "index.md"), body); };
write("a", fm('syndicate: true\n'));
write("b", fm('syndicate: [mastodon]\nsyndication: https://mastodon.social/@me/old\n'));
write("c", fm('syndicate: [mastodon]\n'));
const now = new Date("2026-11-17T12:00:00Z");
const baseItems = () => [
  { url: "https://s.test/a/", title: "A", summary: "Sum", date: "2026-11-16T09:00:00Z", file: "./source/a/index.md", syndicate: ["mastodon", "bluesky", "linkedin"], syndication: [], image: picture },
  { url: "https://s.test/b/", title: "B", summary: "", date: "2026-11-16T09:00:00Z", file: "./source/b/index.md", syndicate: ["mastodon"], syndication: ["https://mastodon.social/@me/old"] },
  { url: "https://s.test/c/", title: "C", summary: "", date: "2026-10-01T09:00:00Z", file: "./source/c/index.md", syndicate: ["mastodon"], syndication: [] },
  { url: "https://s.test/gone/", title: "Gone", summary: "", date: "2026-11-16T09:00:00Z", file: "./source/gone/index.md", syndicate: ["mastodon"], syndication: [] },
];
const env = { MASTODON_TOKEN: "m", BLUESKY_APP_PASSWORD: "b", LINKEDIN_TOKEN: "l", LINKEDIN_AUTHOR: "urn:li:person:abc", LINKEDIN_TOKEN_EXPIRES: "2027-01-01" };
const net = () => fake([
  { at: "https://mastodon.social/api/v1/statuses", reply: { body: { url: "https://mastodon.social/@me/900" } } },
  { at: "https://bsky.social/xrpc/com.atproto.server.createSession", reply: { body: { accessJwt: "J", did: "d", handle: "me.bsky.social" } } },
  { at: "https://benjamin.parry.is/img", reply: { body: jpg, headers: { "content-type": "image/jpeg" } } },
  { at: "https://bsky.social/xrpc/com.atproto.repo.uploadBlob", reply: { body: { blob: { ref: { $link: "x" } } } } },
  { at: "https://bsky.social/xrpc/com.atproto.repo.createRecord", reply: { body: { uri: "at://d/app.bsky.feed.post/k1" } } },
  { at: "https://api.linkedin.com/rest/images", reply: { body: { value: { uploadUrl: "https://www.linkedin.com/up", image: "urn:li:image:1" } } } },
  { at: "https://www.linkedin.com/up", reply: { status: 201 } },
  { at: "https://api.linkedin.com/rest/posts", reply: { status: 201, headers: { "x-restli-id": "urn:li:share:9" } } },
]);
const quiet = [];
const go = (options) => run({ items: baseItems(), config, env, root, now, log: (m) => quiet.push(m), ...options });

let n = net();
let result = await go({ fetchFn: n });
check("a preview sends nothing and touches no files", n.seen.length === 0 && readFileSync(join(root, "source/a/index.md"), "utf8") === fm("syndicate: true\n"));
check("the preview shows the words", quiet.join("\n").includes("| A") && quiet.join("\n").includes("with picture"));
eq("preview results", result.results.map((r) => `${r.url.slice(-3)} ${r.network} ${r.status}`), ["/c/ mastodon too old", "/a/ mastodon would send", "/a/ bluesky would send", "/a/ linkedin would send", "/b/ mastodon already there", "ne/ mastodon can't send"]);

n = net(); quiet.length = 0;
result = await go({ fetchFn: n, post: true });
const status = (u, nw) => result.results.find((r) => r.url.endsWith(u) && r.network === nw)?.status;
eq("sent to all three for A", [status("/a/", "mastodon"), status("/a/", "bluesky"), status("/a/", "linkedin")], ["sent", "sent", "sent"]);
eq("B is already on Mastodon", status("/b/", "mastodon"), "already there");
eq("C is too old", status("/c/", "mastodon"), "too old");
check("a post whose file is missing is not sent, and it fails loudly", status("/gone/", "mastodon") === "FAILED" && !n.seen.some((c) => c.body?.includes?.("Gone")));
eq("the three links are written into the file", readFileSync(join(root, "source/a/index.md"), "utf8"), fm("syndicate: true\nsyndication:\n  - https://mastodon.social/@me/900\n  - https://bsky.app/profile/me.bsky.social/post/k1\n  - https://www.linkedin.com/feed/update/urn:li:share:9/\n"));
eq("failed count", result.failed, 1);

n = net();
const items2 = baseItems(); items2[0].syndication = [];
result = await run({ items: items2.slice(0, 1).map((i) => ({ ...i, syndication: ["https://mastodon.social/@me/900", "https://bsky.app/profile/me.bsky.social/post/k1", "https://www.linkedin.com/feed/update/urn:li:share:9/"] })), config, env, root, now, post: true, fetchFn: n, log() {} });
check("running again sends nothing", n.seen.length === 0 && result.sent === 0);

write("d", fm("syndicate: true\n"));
const dItem = { url: "https://s.test/d/", title: "D", summary: "", date: "2026-11-16T09:00:00Z", file: "./source/d/index.md", syndicate: ["mastodon", "bluesky"], syndication: [] };
n = net();
const bad = { at: "https://bsky.social/xrpc/com.atproto.server.createSession", reply: { status: 401, body: { error: "AuthenticationRequired" } } };
const withBadBluesky = { seen: n.seen, fn: fake([bad, ...[]], n.seen) };
const mixed = async (url, options) => String(url).includes("bsky.social") ? withBadBluesky.fn(url, options) : n(url, options);
result = await run({ items: [dItem], config, env, root, now, post: true, fetchFn: mixed, log() {} });
eq("one network failing doesn't stop the other, and the good link is kept", [result.results.map((r) => r.status), readFileSync(join(root, "source/d/index.md"), "utf8").includes("mastodon.social/@me/900")], [["sent", "FAILED"], true]);

write("e", fm("syndicate: true\n"));
const eItem = { ...dItem, url: "https://s.test/e/", file: "./source/e/index.md", syndication: [] };
const liItem = { ...eItem, syndicate: ["linkedin"], syndication: [] };
n = net(); result = await run({ items: [eItem], config, env: {}, root, now, post: true, fetchFn: n, log() {} });
check("missing secrets fail clearly and send nothing", result.failed === 2 && n.seen.length === 0 && result.results[0].detail.includes("MASTODON_TOKEN"));
n = net(); result = await run({ items: [eItem], config: { ...config, bluesky: { ...config.bluesky, identifier: "" } }, env, root, now, post: true, fetchFn: n, only: ["bluesky"], log() {} });
check("an empty Bluesky handle is reported", result.results[0].detail.includes("bluesky.identifier"));
n = net(); result = await run({ items: [eItem], config, env, root, now, post: false, only: ["mastodon"], log() {} });
eq("--only limits the networks", result.results.map((r) => r.network), ["mastodon"]);
n = net(); result = await run({ items: [eItem, { ...eItem, url: "https://s.test/other/", syndication: [] }], config, env, root, now, url: "https://s.test/other/", log() {} });
eq("--url limits the post", result.results.map((r) => r.url), ["https://s.test/other/", "https://s.test/other/"]);
n = net(); result = await run({ items: [{ ...eItem, syndication: [], date: "2026-01-01T00:00:00Z" }], config, env, root, now, allowOld: true, log() {} });
check("--allow-old lets an old post through", result.results.every((r) => r.status === "would send"));
n = net(); result = await run({ items: [eItem], config: { ...config, mastodon: { ...config.mastodon, enabled: false } }, env, root, now, only: ["mastodon"], log() {} });
eq("a network switched off is skipped", result.results[0].status, "skipped");
n = net(); quiet.length = 0; result = await run({ items: [liItem], config, env: { ...env, LINKEDIN_TOKEN_EXPIRES: "2026-11-20" }, root, now, only: ["linkedin"], log: (m) => quiet.push(m) });
check("a LinkedIn token about to expire is warned about", quiet.join("\n").includes("runs out in 3 days"));
result = await run({ items: [liItem], config, env: { ...env, LINKEDIN_TOKEN_EXPIRES: "2026-11-01" }, root, now, only: ["linkedin"], post: true, fetchFn: net(), log() {} });
check("an expired LinkedIn token fails and sends nothing", result.failed === 1 && result.results[0].detail.includes("ran out"));


// ---- hashtags ----
eq("one word stays as it is", hashtag("Ethics"), "Ethics");
eq("an acronym stays as it is", [hashtag("AI"), hashtag("LLM"), hashtag("GAI")], ["AI", "LLM", "GAI"]);
eq("several words become CamelCase", hashtag("Research by the Sea"), "ResearchByTheSea");
eq("two words", hashtag("User Experience"), "UserExperience");
eq("lower case words get capitals", hashtag("service design"), "ServiceDesign");
eq("capitals inside a word are kept", hashtag("UX design"), "UXDesign");
eq("hyphens and underscores split words", [hashtag("non-fiction"), hashtag("climate_change")], ["NonFiction", "ClimateChange"]);
eq("punctuation is dropped", hashtag("Diversity & Inclusion!"), "DiversityInclusion");
eq("apostrophes don't split a word", hashtag("Don't panic"), "DontPanic");
eq("accents are kept", hashtag("café culture"), "CaféCulture");
eq("a tag with no letters is skipped", [hashtag("2026"), hashtag("---"), hashtag(""), hashtag(undefined)], [undefined, undefined, undefined, undefined]);
eq("a very long tag is skipped", hashtag("x".repeat(80)), undefined);
eq("tags then category", hashtagsOf({ tags: ["Weeknotes", "User Experience"], category: "Technology" }), ["Weeknotes", "UserExperience", "Technology"]);
eq("a single tag string and a category list", hashtagsOf({ tags: "LLM", category: ["People"] }), ["LLM", "People"]);
eq("repeats are removed whatever their case", hashtagsOf({ tags: ["Research", "research", "RESEARCH"], category: "Research" }), ["Research"]);
eq("empty and missing are fine", [hashtagsOf({}), hashtagsOf({ tags: [], category: undefined }), hashtagsOf(undefined)], [[], [], []]);
eq("limited to max", hashtagsOf({ tags: ["a1", "b1", "c1", "d1", "e1", "f1", "g1"] }, { max: 3 }), ["a1", "b1", "c1"]);
const withTags = posseItems({ feedable: [post("/t/", { title: "T", syndicate: true, tags: ["Indieweb", "Service Design"], category: "Technology" }), post("/u/", { title: "U", syndicate: true, tags: ["X"], syndicateHashtags: false }, "2026-11-15T10:00:00Z")] }, { feeds: ["feedable"] }, { url: "https://s.test" });
eq("posse.json carries the hashtags", withTags.items.find((i) => i.title === "T").hashtags, ["Indieweb", "ServiceDesign", "Technology"]);
check("syndicateHashtags: false leaves them off", !("hashtags" in withTags.items.find((i) => i.title === "U")));
const noTags = posseItems({ feedable: [post("/t/", { title: "T", syndicate: true, tags: ["A1"] })] }, { feeds: ["feedable"], hashtags: { enabled: false } }, { url: "https://s.test" });
check("hashtags can be switched off in posse.js", !("hashtags" in noTags.items[0]));
eq("max in posse.js is used", posseItems({ feedable: [post("/t/", { title: "T", syndicate: true, tags: ["A1", "B1", "C1"] })] }, { feeds: ["feedable"], hashtags: { max: 2 } }, { url: "https://s.test" }).items[0].hashtags, ["A1", "B1"]);

const tagged = compose(item, { limit: 500, hashtags: ["Indieweb", "ServiceDesign"] });
eq("hashtags sit between the summary and the link", tagged, "A title\n\nA summary of the post.\n\n#Indieweb #ServiceDesign\n\nhttps://benjamin.parry.is/writing/2026/11/a-post/");
eq("no hashtags, no extra line", compose(item, { limit: 500, hashtags: [] }), compose(item, { limit: 500 }));
const tightTags = compose(long, { limit: 300, hashtags: ["Indieweb", "ServiceDesign"] });
check("a long summary gives way and the hashtags stay", graphemes(tightTags) <= 300 && tightTags.includes("#Indieweb #ServiceDesign") && tightTags.endsWith(item.url) && tightTags.startsWith("A title\n\n"));
const dropTags = compose({ ...item, title: "T".repeat(120), summary: "" }, { limit: 190, hashtags: ["AlphaBeta", "GammaDelta", "EpsilonZeta", "EtaTheta"] });
check("when the title would be cut, hashtags are dropped from the end instead", graphemes(dropTags) <= 190 && dropTags.startsWith("T".repeat(120)) && !dropTags.includes("…") && dropTags.includes("#AlphaBeta") && !dropTags.includes("#GammaDelta"));
check("Mastodon counts the hashtags too", mastodonLength(compose(long, { limit: 500, measure: mastodonLength, hashtags: ["Indieweb", "Ethics"] })) <= 500);
check("a custom text still gets the hashtags", compose({ ...item, text: "Mine" }, { limit: 300, hashtags: ["Ethics"] }).includes("Mine\n\n#Ethics\n\nhttps://"));

const tagText = "Café 🎌\n\n#Indieweb #ServiceDesign\n\nhttps://x.test/a/";
const tf = tagFacets(tagText, ["Indieweb", "ServiceDesign", "Absent"]);
const tagBytes = new TextEncoder().encode(tagText);
eq("tag facets cover the # and the tag, in bytes", tf.map((f) => new TextDecoder().decode(tagBytes.slice(f.index.byteStart, f.index.byteEnd))), ["#Indieweb", "#ServiceDesign"]);
eq("and name the tag without the #", tf.map((f) => [f.features[0].$type, f.features[0].tag]), [["app.bsky.richtext.facet#tag", "Indieweb"], ["app.bsky.richtext.facet#tag", "ServiceDesign"]]);
eq("a # that isn't one of the tags is not marked", tagFacets("#Other and #Indieweb", ["Indieweb"]).length, 1);

f = bsky();
await postBluesky({ identifier: "me.bsky.social", password: "PW", text: tagText, link: { url: "https://x.test/a/", title: "T" }, hashtags: ["Indieweb", "ServiceDesign"] }, f);
const withFacets = JSON.parse(f.seen.find((c) => c.url.endsWith("createRecord")).body).record.facets;
eq("Bluesky gets two tag facets and a link facet, in order", withFacets.map((x) => x.features[0].$type.split("#")[1]), ["tag", "tag", "link"]);
const li2 = fake([{ at: "https://api.linkedin.com/rest/posts", reply: { status: 201, headers: { "x-restli-id": "urn:li:share:3" } } }]);
await postLinkedIn({ token: "t", author: "a", text: "Title (x)", link: { url: "https://x.test/", title: "T" }, hashtags: ["Indieweb", "ServiceDesign"] }, li2);
eq("LinkedIn gets its own hashtag markup after the escaped words", JSON.parse(li2.seen.at(-1).body).commentary, "Title \\(x\\)\n\n{hashtag|\\#|Indieweb} {hashtag|\\#|ServiceDesign}");

const tagRoot = mkdtempSync(join(tmpdir(), "posse-tags-"));
mkdirSync(join(tagRoot, "source/h"), { recursive: true }); writeFileSync(join(tagRoot, "source/h/index.md"), fm("syndicate: true\n"));
const hItem = { url: "https://s.test/h/", title: "H", summary: "Sum", date: "2026-11-16T09:00:00Z", file: "./source/h/index.md", syndicate: ["mastodon", "bluesky", "linkedin"], syndication: [], hashtags: ["Ethics", "ServiceDesign"] };
const tn = net();
const tagRun = await run({ items: [hItem], config, env, root: tagRoot, now, post: true, fetchFn: tn, log() {} });
check("a whole run carries the hashtags to every network", tagRun.sent === 3 && JSON.parse(tn.seen.find((c) => c.url.includes("/statuses")).body).status.includes("#Ethics #ServiceDesign") && JSON.parse(tn.seen.find((c) => c.url.endsWith("/rest/posts")).body).commentary.includes("{hashtag|\\#|Ethics}"));
const preview = []; await run({ items: [{ ...hItem, syndication: [] }], config, env, root: tagRoot, now, log: (m) => preview.push(m) });
check("the preview shows the hashtags for each network", preview.filter((l) => l.includes("#Ethics #ServiceDesign")).length >= 3);

// ---- LinkedIn sign-in helper ----
const url = new URL(authorizeUrl("CID", "STATE"));
eq("authorise address", [url.origin + url.pathname, url.searchParams.get("client_id"), url.searchParams.get("state"), url.searchParams.get("scope"), url.searchParams.get("redirect_uri")], ["https://www.linkedin.com/oauth/v2/authorization", "CID", "STATE", "openid profile w_member_social", "http://localhost:8765/callback"]);
eq("expiry is 60 days on", expiryDate(5184000, new Date("2026-11-17T00:00:00Z")), "2027-01-16");

console.log(`${pass} of ${pass + fail} passed`);
process.exit(fail ? 1 : 0);
