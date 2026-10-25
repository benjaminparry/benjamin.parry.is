// Helpers for the /sending/ collections (likes, replies): posts I publish that point at somebody
// else's page, and that webmentions are sent from.
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// Posts live in source/sending/<section>/ and are published at
//   /sending/<section>/yyyy/mm/<kind>_yyyymmddhhmmss/
// The last part is worked out from the post's own date (in UTC), not from its file name, so the
// address is always in that form.
//
// Front matter, all optional except the link:
//   likes:    likeOf: https://…        the page I liked          author: who wrote it
//   replies:  inReplyTo: https://…     the page I'm replying to
//   either:   date, title, tags, category, summary, syndication (a list of copies elsewhere)
// Later sections could also use repostOf and bookmarkOf: the layout already understands them.

import { newestFirst, writingYears, writingMonths } from "./writing.js";
import { hostOf } from "./webmentions.js";

// slug = the folder name and the URL segment. kind = the start of every post's address.
// Add a line here (plus a folder, an index.html and a data file) to add another section, e.g. reposts.
export const sections = [
  { slug: "likes", title: "Likes", kind: "like" },
  { slug: "replies", title: "Replies", kind: "reply" },
];

// "Likes" -> "sendingLikes"
export const collectionName = (slug) => "sending" + slug.charAt(0).toUpperCase() + slug.slice(1);

export const globFor = (slug) => `source/sending/${slug}/*.md`;   // one section
export const allGlob = "source/sending/*/*.md";                    // every section

export const sendingYears = writingYears;
export const sendingMonths = writingMonths;
export { newestFirst };

// 2025-01-10T16:32:10Z -> "20250110163210"
export function stamp(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d+Z$/, "").replace(/[-:T]/g, "");
}

// A title for a post that doesn't have one: "Liked a post by Jeremy Keith", "Replied to adactio.com"
export function defaultTitle(data) {
  if (data.likeOf) return data.author ? `Liked a post by ${data.author}` : `Liked ${hostOf(data.likeOf) || "a post"}`;
  if (data.inReplyTo) return `Replied to ${hostOf(data.inReplyTo) || "a post"}`;
  if (data.repostOf) return `Reposted ${hostOf(data.repostOf) || "a post"}`;
  if (data.bookmarkOf) return `Bookmarked ${hostOf(data.bookmarkOf) || "a page"}`;
  return "Post";
}

// The data every post in one section shares (used by source/sending/<section>/<section>.11tydata.js)
export const sectionData = (section) => ({
  layout: "layouts/sending-post.html",
  collection: "sending",
  collectionTitle: "Sending",
  subsection: section.slug,
  subsectionTitle: section.title,
  showWebmentions: true,
  permalink: `/sending/${section.slug}/{{ page.date | yearOf }}/{{ page.date | monthOf }}/${section.kind}_{{ page.date | stamp }}/`,
  eleventyComputed: {
    title: (data) => data.title || defaultTitle(data),
  },
});
