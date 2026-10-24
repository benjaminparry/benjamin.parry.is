// Helpers for the related content component (source/_includes/macros/related.html).
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// Given the page you are on and a pool of every post, it suggests other posts that share
// a tag and/or a category with it. Tags and categories are compared the way tag pages are:
// "Research by the Sea" and "research by the sea" count as the same.

import { slugify, newestFirst } from "./writing.js";

// Used for any option you leave out
export const defaults = {
  limit: 3,            // how many suggestions to show in total
  tags: true,          // suggest posts that share a tag
  category: true,      // suggest posts that share a category
  featured: "prefer",  // "prefer" = featured posts first, "only" = featured posts only, "ignore" = no special treatment
};

// A list or a single string, as a set of comparable keys: ["Data", "data "] -> Set { "data" }
const keysOf = (value) =>
  new Set([].concat(value ?? []).map((v) => slugify(String(v))).filter(Boolean));

const overlap = (a, b) => [...a].filter((key) => b.has(key)).length;

// `featured: true` in the front matter ("true" in quotes is accepted too)
export const isFeatured = (data = {}) => data.featured === true || data.featured === "true";

// The pool is a list of Eleventy collection items. Returns up to `limit` of them, best match first:
//   related(collections.relatable, page, { limit: 4, tags: true, category: false, featured: "only" })
//
// - current: the page you are on (only its url is used to find it in the pool and to leave it out).
//            For a page that isn't in the pool, say what to match on: { match: { tags: [...], category: "..." } }
// - ranking: the most shared tags and categories first, featured posts ahead of the rest when
//            featured is "prefer", newest first when everything else is equal.
export function related(pool = [], current = {}, options = {}) {
  const limit = Math.max(0, Math.floor(Number(options.limit ?? defaults.limit)));
  const useTags = options.tags ?? defaults.tags;
  const useCategory = options.category ?? defaults.category;
  const featured = options.featured ?? defaults.featured;

  if (!limit || (!useTags && !useCategory)) return [];

  // What we are matching against: the page's own front matter, or the `match` option
  const self = pool.find((post) => post.url === current.url);
  const source = options.match ?? self?.data ?? {};
  const wantedTags = useTags ? keysOf(source.tags) : new Set();
  const wantedCategories = useCategory ? keysOf(source.category) : new Set();
  if (!wantedTags.size && !wantedCategories.size) return [];

  const scored = [];
  for (const post of pool) {
    if (!post.url || post.url === current.url) continue;            // not the page itself
    if (featured === "only" && !isFeatured(post.data)) continue;

    const score =
      (useTags ? overlap(wantedTags, keysOf(post.data.tags)) : 0) +
      (useCategory ? overlap(wantedCategories, keysOf(post.data.category)) : 0);
    if (score > 0) scored.push({ post, score });
  }

  // newestFirst gives the starting order, and the sort below is stable, so ties stay newest first
  const order = new Map(newestFirst(scored.map((s) => s.post)).map((post, i) => [post, i]));
  const featuredRank = (post) => (featured === "prefer" && isFeatured(post.data) ? 0 : 1);

  return scored
    .sort((a, b) =>
      featuredRank(a.post) - featuredRank(b.post) ||
      b.score - a.score ||
      order.get(a.post) - order.get(b.post))
    .slice(0, limit)
    .map((s) => s.post);
}
