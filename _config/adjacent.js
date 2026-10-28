// Finds the posts either side of a given post, for "previous post" / "next post" links.
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// Posts are put in date order using postDate() (so watched / read / played / listened posts use their
// activity date), oldest first. "previous" is the post before this one (older) and "next" is the
// post after it (newer). The oldest post has no previous and the newest has no next: those are null.
// Posts with no url or no usable date are skipped, and the same post is never returned for both.

import { postDate } from "./writing.js";

const hasDate = (post) => !Number.isNaN(postDate(post).getTime());

export function adjacentPosts(pool, current) {
  const none = { previous: null, next: null };
  if (!Array.isArray(pool) || !current?.url) return none;

  const ordered = pool
    .filter((post) => post?.url && post.date !== undefined && hasDate(post))
    .sort((a, b) => postDate(a) - postDate(b) || String(a.url).localeCompare(String(b.url)));   // same date: by url, so the order is stable

  const index = ordered.findIndex((post) => post.url === current.url);
  if (index === -1) return none;
  return { previous: ordered[index - 1] ?? null, next: ordered[index + 1] ?? null };
}
