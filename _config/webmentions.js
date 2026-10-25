// Helpers for incoming webmentions (fetched from webmention.io when the site is built).
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// Nothing here runs in the visitor's browser: the mentions are fetched once per build and
// written into the HTML. To see new mentions, the site has to be built again.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// What each webmention.io `wm-property` means, in the words used on the page
const KINDS = {
  "like-of":     { verb: "liked",         singular: "like",     plural: "likes" },
  "in-reply-to": { verb: "replied to",    singular: "reply",    plural: "replies" },
  "repost-of":   { verb: "reposted",      singular: "repost",   plural: "reposts" },
  "mention-of":  { verb: "mentioned",     singular: "mention",  plural: "mentions" },
  "bookmark-of": { verb: "bookmarked",    singular: "bookmark", plural: "bookmarks" },
  "rsvp":        { verb: "RSVPed to",       singular: "RSVP",     plural: "RSVPs" },
};
const kindRank = (property) => { const i = Object.keys(KINDS).indexOf(property); return i === -1 ? 99 : i; };
const OTHER = { verb: "mentioned", singular: "mention", plural: "mentions" };
const kindOf = (property) => KINDS[property] ?? OTHER;

// Only ever link to web addresses: a mention comes from anyone on the internet
export const safeUrl = (url) => (/^https?:\/\//i.test(String(url ?? "").trim()) ? String(url).trim() : "");

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Makes two spellings of the same page comparable:
//   "http://www.Example.com/writing/post"  and  "https://example.com/writing/post/?utm=x#top"
//   both become "example.com/writing/post/"
export function normaliseUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/index\.html?$/, "").replace(/\/+$/, "");
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${path}/`;
  } catch {
    return "";
  }
}

// A date that can be shown: a mention comes from anyone on the internet, so `published` may be missing or not a
// date at all. A bad one would stop the whole build when it was formatted, so fall back to when it was received.
const validDate = (value) => (value && !Number.isNaN(new Date(value).getTime()) ? value : null);
const publishedOf = (mention) => validDate(mention.published) ?? validDate(mention["wm-received"]);
const timeOf = (mention) => {
  const t = new Date(publishedOf(mention)).getTime();
  return Number.isNaN(t) ? 0 : t;
};

// A mention, tidied up for a template.
function viewOf(mention) {
  const property = mention["wm-property"] ?? "mention-of";
  const source = safeUrl(mention["wm-source"]);
  const url = safeUrl(mention.url) || source;
  const text = String(mention.content?.text ?? "").replace(/\s+/g, " ").trim();
  return {
    id: mention["wm-id"],
    property,
    verb: kindOf(property).verb,
    author: {
      name: String(mention.author?.name ?? "").trim() || hostOf(url) || "Someone",
      url: safeUrl(mention.author?.url),
    },
    date: publishedOf(mention),         // when it was published, or if that isn't known, when it was received
    source,                             // the page that mentions this one
    url,                                // the link to show: the mention itself, or its source page
    host: hostOf(url),
    text: text.length > 280 ? `${text.slice(0, 279).trimEnd()}…` : text,
  };
}

// The mentions of one page, newest first.
//   webmentionsFor(webmentions, "/writing/2025/02/a-post/", { siteUrl: "https://example.com" })
//
// Options:
//   siteUrl  the site's address, so a page's url can be compared with a mention's target (required)
//   types    only these kinds, e.g. ["in-reply-to", "mention-of"]. Default: every kind.
//   aliases  other addresses this page has had (an old url, say). Mentions of those count too.
export function webmentionsFor(mentions = [], pageUrl = "", options = {}) {
  if (!Array.isArray(mentions) || !pageUrl) return [];

  const wanted = new Set(
    [pageUrl, ...[].concat(options.aliases ?? [])]
      .filter(Boolean)
      .map((u) => normaliseUrl(/^https?:\/\//i.test(u) ? u : `${options.siteUrl ?? ""}${u}`))
      .filter(Boolean));
  const types = options.types ? new Set([].concat(options.types)) : null;

  const seen = new Set();
  return mentions
    .filter((m) => m && !m["wm-private"] && wanted.has(normaliseUrl(m["wm-target"])))   // private ones are never shown
    .filter((m) => !types || types.has(m["wm-property"]))
    .filter((m) => (m["wm-id"] === undefined ? true : !seen.has(m["wm-id"]) && seen.add(m["wm-id"])))
    .sort((a, b) => timeOf(b) - timeOf(a))
    .map(viewOf);
}

// How many there are: { total: 4, breakdown: "2 likes, 1 reply, 1 mention" }
export function summariseWebmentions(items = []) {
  const counts = new Map();
  for (const item of items) counts.set(item.property, (counts.get(item.property) ?? 0) + 1);
  const breakdown = [...counts]
    .sort((a, b) => b[1] - a[1] || kindRank(a[0]) - kindRank(b[0]))   // most first; ties in a fixed order
    .map(([property, n]) => `${n} ${n === 1 ? kindOf(property).singular : kindOf(property).plural}`)
    .join(", ");
  return { total: items.length, breakdown };
}

// --- fetching ----------------------------------------------------------------------------------

const readCache = (file) => {
  try {
    const cache = JSON.parse(readFileSync(file, "utf8"));
    return { fetchedAt: Number(cache.fetchedAt) || 0, children: Array.isArray(cache.children) ? cache.children : [] };
  } catch {
    return { fetchedAt: 0, children: [] };
  }
};

const writeCache = (file, cache) => {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(cache));
  } catch (error) {
    console.warn(`[webmentions] could not write the cache: ${error.message}`);
  }
};

// Every public webmention for a domain, from webmention.io. Never throws: if the fetch fails, or there is no
// token, the last good copy is used (and an empty list if there isn't one), so a build never fails
// because of webmentions.
//
//   domain          your domain as set up on webmention.io, e.g. "benjamin.parry.is"
//   token           the API token from webmention.io/settings (process.env.WEBMENTION_IO_TOKEN)
//   cacheFile       where to keep the last copy. It is also reused for a few minutes (see maxAgeMinutes),
//                   so a local `npm start` that rebuilds again and again doesn't call the service every time.
//   maxAgeMinutes   how long the cached copy counts as fresh. 0 = always fetch.
export async function fetchWebmentions({
  domain,
  token,
  cacheFile = ".cache/webmentions.json",
  maxAgeMinutes = 10,
  perPage = 1000,
  maxPages = 50,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  log = console,
} = {}) {
  const cache = readCache(cacheFile);

  if (maxAgeMinutes > 0 && cache.fetchedAt && now() - cache.fetchedAt < maxAgeMinutes * 60_000) return cache.children;

  if (!domain || !token) {
    log.warn("[webmentions] WEBMENTION_IO_TOKEN is not set, so no incoming webmentions were fetched.");
    return cache.children;
  }

  try {
    const byId = new Map();
    for (let page = 0; page < maxPages; page++) {
      const query = new URLSearchParams({ domain, token, "per-page": String(perPage), page: String(page) });
      const response = await fetchImpl(`https://webmention.io/api/mentions.jf2?${query}`);
      if (!response.ok) throw new Error(`webmention.io answered ${response.status}`);
      const children = (await response.json()).children ?? [];
      for (const child of children) {
        if (child["wm-private"]) continue;     // the token lets webmention.io return private mentions: they must never be published
        byId.set(child["wm-id"] ?? `${child["wm-source"]}>${child["wm-target"]}`, child);
      }
      if (children.length < perPage) break;            // the last page
    }
    const fresh = [...byId.values()];
    writeCache(cacheFile, { fetchedAt: now(), children: fresh });
    log.info?.(`[webmentions] fetched ${fresh.length} from webmention.io`);
    return fresh;
  } catch (error) {
    log.warn(`[webmentions] could not fetch from webmention.io (${error.message}); using the last saved copy (${cache.children.length}).`);
    return cache.children;
  }
}
