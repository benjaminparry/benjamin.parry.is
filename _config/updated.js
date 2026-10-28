// Helpers for the "updated" front matter and the /everything-everywhere-all-at-once/ feeds.
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// A post can record when it was changed, and why, in any of these ways:
//
//   updated: 2025-01-07                          one date
//   updated: [2025-01-07, 2025-03-02]            several dates
//   updated:                                     dates with comments (comment or note both work)
//     - date: 2025-03-02
//       comment: Added the second half
//     - date: 2025-01-07
//       comment: Fixed a typo
//   updated:                                     the short form: date, then comment
//     - 2025-03-02: Added the second half
//     - 2025-01-07: Fixed a typo
//
// Every form gives the same result from updatesOf(): [{ date: Date, comment: "" }], newest first.

import { postDate } from "./writing.js";

const toDate = (value) => {
  // A bare number (updated: 2025) is not a date; new Date(2025) would be 1970
  if (value == null || value === "" || value === false || typeof value === "number") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toComment = (value) => (typeof value === "string" ? value.trim() : "");

// One item of the updated list -> [{ date, comment }] (a short-form item can hold several dates)
function readItem(item) {
  if (item instanceof Date || typeof item !== "object" || item === null) {
    const date = toDate(item);
    return date ? [{ date, comment: "" }] : [];
  }
  if ("date" in item || "on" in item) {
    const date = toDate(item.date ?? item.on);
    return date ? [{ date, comment: toComment(item.comment ?? item.note) }] : [];
  }
  // Short form: { "2025-03-02": "Added the second half" }
  return Object.entries(item).flatMap(([key, comment]) => {
    const date = toDate(key);
    return date ? [{ date, comment: toComment(comment) }] : [];
  });
}

// The updates recorded on a post, newest first. Anything that isn't a valid date is ignored.
export function updatesOf(post) {
  const raw = post?.data?.updated;
  const items = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  return items.flatMap(readItem).sort((a, b) => b.date - a.date);
}

// The date an entry is ordered by in a feed: its latest update when byUpdated is true
// (a post with no updates falls back to its own date), otherwise its own date.
export function feedDate(post, byUpdated) {
  const [latest] = byUpdated ? updatesOf(post) : [];
  return latest ? latest.date : postDate(post);
}

// Posts with at least one update, most recently updated first
export function updatedFirst(posts) {
  return posts
    .filter((post) => updatesOf(post).length > 0)
    .sort((a, b) => feedDate(b, true) - feedDate(a, true) || postDate(b) - postDate(a));
}

const titleCase = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Which part of the site a post belongs to, for labelling mixed lists: { title, url }
// Posts are in source/<part>/..., and collecting posts are in source/collecting/<section>/...
export function partOf(post) {
  const segments = String(post.inputPath ?? "").replace(/^\.\//, "").split("/");
  const part = segments[0] === "source" ? segments[1] : segments[0];
  if (part === "collecting" && post.data?.section) {
    return { title: post.data.sectionTitle ?? titleCase(post.data.section), url: `/collecting/${post.data.section}/` };
  }
  return part ? { title: titleCase(part), url: `/${part}/` } : { title: "", url: "" };
}
