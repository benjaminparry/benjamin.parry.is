// Helpers for the /writing/ and /tagging/ collections.
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// Posts live in source/writing/ and are named with their date: 2025-11-06-trails-of-experience.md
// Eleventy reads that date as the post's date (item.date) and uses "trails-of-experience" as its fileSlug.

// "Data Science!" -> "data-science"   (used for tag page URLs)
export function slugify(text) {
  const clean = String(text).trim();
  const slug = clean
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")   // é -> e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || encodeURIComponent(clean.toLowerCase());  // e.g. a tag written in non-Latin characters
}

// UTC, so a date never shifts an hour in British Summer Time
export const yearOf = (date) => date.getUTCFullYear();
export const monthOf = (date) => String(date.getUTCMonth() + 1).padStart(2, "0");  // "03", "11"
const monthName = (date) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(date);

// The date a post sorts by. Watching, reading, playing and listening posts have no date of their own:
// their dates are in their watched / read / played / listened list, so they set `sortDate` from it
// (see activity.js). Every other post uses its date.
export const postDate = (post) => new Date(post.data?.sortDate ?? post.date);

export const newestFirst = (posts) => [...posts].sort((a, b) => postDate(b) - postDate(a));

// [{ month: "11", name: "November", count: 2 }, ...] newest first, for a list of posts
function monthsOf(posts) {
  const months = new Map();
  for (const post of newestFirst(posts)) {
    const month = monthOf(post.date);
    if (!months.has(month)) months.set(month, { month, name: monthName(post.date), count: 0 });
    months.get(month).count++;
  }
  return [...months.values()];
}

// One entry per year with posts, newest year first:
//   [{ year: 2025, posts: [...], months: [{ month: "11", name: "November", count: 2 }] }]
export function writingYears(posts) {
  const years = new Map();
  for (const post of newestFirst(posts)) {
    const year = yearOf(post.date);
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(post);
  }
  return [...years]
    .map(([year, yearPosts]) => ({ year, posts: yearPosts, months: monthsOf(yearPosts) }))
    .sort((a, b) => b.year - a.year);
}

// One entry per month with posts, newest month first:
//   [{ year: 2025, month: "11", name: "November", posts: [...] }]
export function writingMonths(posts) {
  const months = new Map();
  for (const post of newestFirst(posts)) {   // newest first, so the Map is already in order
    const year = yearOf(post.date);
    const month = monthOf(post.date);
    const key = `${year}-${month}`;
    if (!months.has(key)) months.set(key, { year, month, name: monthName(post.date), posts: [] });
    months.get(key).posts.push(post);
  }
  return [...months.values()];
}

// One entry per tag, alphabetical:
//   [{ name: "Data", slug: "data", posts: [...] }]
// "Data" and "data" on different posts become the same tag (same slug).
export function writingTags(posts) {
  const tags = new Map();
  for (const post of newestFirst(posts)) {
    for (const name of [].concat(post.data.tags ?? [])) {   // accepts a list or a single string
      const slug = slugify(name);
      if (!slug) continue;
      if (!tags.has(slug)) tags.set(slug, { name: String(name).trim(), slug, posts: [] });
      const tag = tags.get(slug);
      if (!tag.posts.includes(post)) tag.posts.push(post);   // the same tag twice on one post counts once
    }
  }
  return [...tags.values()].sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
}
