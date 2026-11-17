// POSSE: Publish (on your) Own Site, Syndicate Elsewhere. https://indieweb.org/POSSE
// The pure parts: which posts go where, and what the social post says. No network calls here (see posse-networks.js).

export const NETWORKS = ["mastodon", "bluesky", "linkedin"];

// syndicate: true            every network that is switched on
// syndicate: [mastodon, bluesky]   just those
// syndicate: false (or nothing)    none
export function wantedNetworks(value, enabled = NETWORKS) {
  if (value === true || value === "true" || value === "all") return [...enabled];
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(list.map((name) => String(name).trim().toLowerCase()).filter((name) => enabled.includes(name)))];
}
export const unknownNetworks = (value) =>
  (Array.isArray(value) ? value : typeof value === "string" && value !== "true" && value !== "all" ? value.split(",") : [])
    .map((name) => String(name).trim().toLowerCase()).filter((name) => name && !NETWORKS.includes(name));

// Which network does a link belong to? Used to see that a post is already there.
export function networkOf(url, config = {}) {
  let host;
  try { host = new URL(url).host.toLowerCase(); } catch { return undefined; }
  const mastodon = config.mastodon?.instance ? new URL(config.mastodon.instance).host.toLowerCase() : "";
  if (mastodon && host === mastodon) return "mastodon";
  if (host === "bsky.app" || host.endsWith(".bsky.app")) return "bluesky";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
  return undefined;
}
export const alreadyOn = (syndication, network, config) =>
  (Array.isArray(syndication) ? syndication : syndication ? [syndication] : []).some((url) => networkOf(url, config) === network);

// ---- hashtags from a post's tags: and category: ----
// "Research" stays "#Research". Several words are run together in CamelCase: "Research by the Sea" becomes
// "#ResearchByTheSea". Punctuation is dropped and capitals inside a word are kept ("UX design"
// becomes "#UXDesign"). A tag with no letters in it (a year, say) can't be a hashtag and is skipped.
export function hashtag(tag) {
  const words = String(tag ?? "").replace(/['’`]/g, "").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!words.length) return undefined;
  const joined = words.length === 1 ? words[0] : words.map((word) => word[0].toUpperCase() + word.slice(1)).join("");
  return /\p{L}/u.test(joined) && joined.length <= 60 ? joined : undefined;
}

export function hashtagsOf(data, { max = 5 } = {}) {
  const list = (value) => (Array.isArray(value) ? value : value ? [value] : []);
  const seen = new Set();
  const tags = [];
  for (const tag of [...list(data?.tags), ...list(data?.category)]) {
    const clean = hashtag(tag);
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    tags.push(clean);
  }
  return tags.slice(0, max);
}

// ---- /posse.json: the posts that have asked to be syndicated (see source/posse.json.njk) ----
export function posseItems(collections, posse, site) {
  const seen = new Map();
  for (const name of posse.feeds ?? []) for (const post of collections?.[name] ?? []) if (!seen.has(post.url)) seen.set(post.url, post);
  const items = [];
  for (const post of seen.values()) {
    const data = post.data ?? {};
    const syndicate = wantedNetworks(data.syndicate);
    const unknown = unknownNetworks(data.syndicate);
    if (!syndicate.length && !unknown.length) continue;
    const media = data.mediaSet;
    const picture = media?.social?.[0] ?? media?.hero ?? media?.feed;
    items.push({
      url: new URL(post.url, site.url).href,
      title: data.title ?? "",
      summary: data.summary ?? "",
      date: new Date(post.date).toISOString(),
      file: post.inputPath,
      syndicate,
      ...(unknown.length ? { unknown } : {}),
      syndication: [].concat(data.syndication ?? []),
      ...(posse.hashtags?.enabled !== false && data.syndicateHashtags !== false ? { hashtags: hashtagsOf(data, { max: posse.hashtags?.max ?? 5 }) } : {}),
      ...(data.syndicateText ? { text: String(data.syndicateText) } : {}),
      ...(picture?.abs ? { image: { url: picture.abs, alt: picture.alt ?? "", type: picture.type ?? "", width: picture.width, height: picture.height } } : {}),
    });
  }
  items.sort((a, b) => b.date.localeCompare(a.date));
  return { generated: new Date().toISOString(), items: items.slice(0, 50) };
}

// ---- what the post says ----
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
export const graphemes = (text) => [...segmenter.segment(text)].length;

// Mastodon counts every link as 23 characters, whatever its length
export const mastodonLength = (text) => graphemes(text.replace(/https?:\/\/\S+/g, "x".repeat(23)));

// Title, a blank line, the summary, a blank line, the hashtags, a blank line and the link. If it is too long the
// summary is shortened first, at a word, with "…". Then hashtags are dropped from the end. The title and the link
// are never cut (unless the title alone is too long).
export function compose(item, { limit, measure = graphemes, includeUrl = true, hashtags = [] }) {
  const body = item.text ?? [item.title, item.summary].filter(Boolean).join("\n\n");
  const lead = item.text ?? item.title ?? "";
  for (let n = hashtags.length; n >= 0; n--) {
    const tagLine = hashtags.slice(0, n).map((tag) => `#${tag}`).join(" ");
    const suffix = [tagLine, includeUrl ? item.url : ""].filter(Boolean).map((part) => `\n\n${part}`).join("");
    const whole = (b) => (b + suffix).trim();
    if (measure(whole(body)) <= limit) return whole(body);
    if (n > 0 && limit - measure(suffix) < measure(lead) + 1) continue;      // the title wouldn't fit whole: fewer hashtags
    const parts = [...segmenter.segment(body)].map((s) => s.segment);
    let keep = Math.max(0, limit - measure(suffix) - 1);
    let out = "";
    for (; keep >= 0; keep--) {
      out = parts.slice(0, keep).join("");
      const cut = out.lastIndexOf(" ");
      if (cut > out.length * 0.5) out = out.slice(0, cut);
      out = out.replace(/[\s.,;:!?\-–—]+$/, "") + "…";
      if (measure(whole(out)) <= limit) break;
    }
    return whole(out);
  }
}

// Bluesky wants the position of each link in bytes (UTF-8), not characters
export function linkFacets(text, url) {
  const at = text.indexOf(url);
  if (at < 0) return [];
  const encoder = new TextEncoder();
  const byteStart = encoder.encode(text.slice(0, at)).length;
  return [{ index: { byteStart, byteEnd: byteStart + encoder.encode(url).length }, features: [{ $type: "app.bsky.richtext.facet#link", uri: url }] }];
}

// Bluesky also wants each hashtag marked: the range covers the "#", the tag itself doesn't include it
export function tagFacets(text, hashtags) {
  const encoder = new TextEncoder();
  const known = new Set(hashtags);
  const facets = [];
  for (const match of text.matchAll(/#([\p{L}\p{N}_]+)/gu)) {
    if (!known.has(match[1])) continue;
    const byteStart = encoder.encode(text.slice(0, match.index)).length;
    facets.push({ index: { byteStart, byteEnd: byteStart + encoder.encode(match[0]).length }, features: [{ $type: "app.bsky.richtext.facet#tag", tag: match[1] }] });
  }
  return facets;
}

// LinkedIn reads these characters as formatting, so each needs a backslash
export const escapeLinkedIn = (text) => text.replace(/[\\|{}@\[\]()<>#*_~]/g, "\\$&");

export function shorten(text, max) {
  const parts = [...segmenter.segment(text)].map((s) => s.segment);
  return parts.length <= max ? text : parts.slice(0, max - 1).join("").trimEnd() + "…";
}

// ---- writing the new link back into the post's front matter ----
export function addSyndication(text, url) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== "---") return undefined;
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  if (end < 0) return undefined;
  const at = lines.slice(1, end).findIndex((l) => /^syndication\s*:/.test(l)) + 1;
  if (at === 0) {
    lines.splice(end, 0, "syndication:", `  - ${url}`);
  } else {
    const inline = lines[at].replace(/^syndication\s*:\s*/, "").trim();
    if (inline.startsWith("[")) {
      const existing = inline.replace(/^\[|\]\s*$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
      lines.splice(at, 1, "syndication:", ...existing.map((u) => `  - ${u}`), `  - ${url}`);
    } else if (inline && !inline.startsWith("#")) {
      lines.splice(at, 1, "syndication:", `  - ${inline}`, `  - ${url}`);
    } else {
      let last = at;
      for (let i = at + 1; i < end; i++) { if (/^\s*-\s+/.test(lines[i])) last = i; else if (lines[i].trim() !== "" && !/^\s*#/.test(lines[i])) break; }
      lines.splice(last + 1, 0, `  - ${url}`);
    }
  }
  return lines.join(eol);
}
