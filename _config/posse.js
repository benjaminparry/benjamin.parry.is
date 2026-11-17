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

// Title, a blank line, the summary, and (if wanted) a blank line and the link. If it is too long the summary is
// shortened first, at a word, with "…". The link is never cut.
export function compose(item, { limit, measure = graphemes, includeUrl = true }) {
  const body = item.text ?? [item.title, item.summary].filter(Boolean).join("\n\n");
  const suffix = includeUrl ? `\n\n${item.url}` : "";
  const whole = (b) => (b + suffix).trim();
  if (measure(whole(body)) <= limit) return whole(body);
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

// Bluesky wants the position of each link in bytes (UTF-8), not characters
export function linkFacets(text, url) {
  const at = text.indexOf(url);
  if (at < 0) return [];
  const encoder = new TextEncoder();
  const byteStart = encoder.encode(text.slice(0, at)).length;
  return [{ index: { byteStart, byteEnd: byteStart + encoder.encode(url).length }, features: [{ $type: "app.bsky.richtext.facet#link", uri: url }] }];
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
