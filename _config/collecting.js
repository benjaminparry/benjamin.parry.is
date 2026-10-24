// Helpers for the /collecting/ collections (cycles, links, lists, photos, podcasts, thoughts).
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// Posts live in source/collecting/<section>/ and are named with their date:
//   source/collecting/cycles/2026-07-11-cycles-20260608-20260711.md
// The year and month grouping is the same as for writing, so those helpers are reused.

import { newestFirst, writingYears, writingMonths } from "./writing.js";

// slug = the folder name and the URL segment. title = the heading shown on the site.
// Add a line here (plus a folder and an index.html) to add a seventh section.
export const sections = [
  { slug: "cycles", title: "Cycles" },
  { slug: "links", title: "Links" },
  { slug: "lists", title: "Lists" },
  { slug: "photos", title: "Photos" },
  { slug: "podcasts", title: "Podcasts" },
  { slug: "thoughts", title: "Thoughts" },
];

// "Cycles" -> "collectingCycles". Prefixed so a section never clashes with
// one of your tags: a post tagged "Photos" already makes collections.Photos.
export const collectionName = (slug) =>
  "collecting" + slug.charAt(0).toUpperCase() + slug.slice(1);

export const globFor = (slug) => `source/collecting/${slug}/*.md`;   // one section
export const allGlob = "source/collecting/*/*.md";                    // every section

// Which section a post belongs to, worked out from its folder:
//   "./source/collecting/links/2026-05-30-rowboat.md" -> { slug: "links", title: "Links" }
export function sectionOf(post) {
  const match = String(post.inputPath).replace(/\\/g, "/").match(/\/collecting\/([^/]+)\//);
  return sections.find((s) => s.slug === match?.[1]);
}

// Reuse the year and month grouping used for writing
export const collectingYears = writingYears;
export const collectingMonths = writingMonths;
export { newestFirst };

// "https://www.rowboat.net/product/" -> "rowboat.net"; anything that isn't a URL comes back unchanged
export function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url);
  }
}
