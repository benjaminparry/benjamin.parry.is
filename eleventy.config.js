import { currentlyWatching, allWatched, watchedByYear, watchedInYear, watchedBeforeYear } from "./_config/watching.js";
import { slugify, yearOf, monthOf, newestFirst, writingYears, writingMonths, writingTags } from "./_config/writing.js";
import { sections, collectionName, globFor, allGlob, collectingYears, collectingMonths, hostname } from "./_config/collecting.js";
import { roots, rootGlob, yearsName, monthsName, rootYears, rootMonths } from "./_config/roots.js";
import { activities, activityGlob, activityCollections, coverSrc } from "./_config/activity.js";
import { related, onThisDay } from "./_config/related.js";
import { webmentionsFor, summariseWebmentions } from "./_config/webmentions.js";
import { sections as sendingSections, collectionName as sendingName, globFor as sendingGlob, allGlob as sendingAllGlob, sendingYears, sendingMonths, stamp } from "./_config/sending.js";
import { feedContent } from "./_config/feed.js";
import { updatesOf, feedDate, updatedFirst, createdFirst, partOf } from "./_config/updated.js";
import site from "./source/_data/site.js";

// Every Markdown file directly inside source/watching/ is a watched item
const watchingFiles = "source/watching/*.md";

// Every Markdown file directly inside source/writing/ is a writing post
const writingFiles = "source/writing/*.md";

// Tolerates a Date or a date written as text ("2026-01-02")
const asDate = (d) => (d instanceof Date ? d : new Date(d));

// Every post that has tags or a category: writing, collecting, the root collections,
// sending, watching, and reading/playing/listening.
const taggablePosts = (api) => [
  ...api.getFilteredByGlob(writingFiles),
  ...api.getFilteredByGlob(watchingFiles),
  ...api.getFilteredByGlob(allGlob),
  ...api.getFilteredByGlob(sendingAllGlob),
  ...roots.flatMap((root) => api.getFilteredByGlob(rootGlob(root.slug))),
  ...activities.flatMap((activity) => api.getFilteredByGlob(activityGlob(activity.slug))),
];

export default function (eleventyConfig) {

  // Set source and build directories
  eleventyConfig.setInputDirectory('source');
  eleventyConfig.setOutputDirectory('build');

  // Set directories to pass through to build directory
  eleventyConfig.addPassthroughCopy('source/assets/images');
  eleventyConfig.addPassthroughCopy('source/assets/audio');   // mirrored talks and podcasts
  eleventyConfig.addPassthroughCopy('source/assets/video');
  eleventyConfig.addPassthroughCopy('source/assets/other');   // e.g. the vCard

  // Watching collections
  eleventyConfig.addCollection("currentlyWatching", (api) =>
    currentlyWatching(api.getFilteredByGlob(watchingFiles)));

  eleventyConfig.addCollection("allWatched", (api) =>
    allWatched(api.getFilteredByGlob(watchingFiles)));

  // The year is worked out each time the site is built
  eleventyConfig.addCollection("watchedThisYear", (api) =>
    watchedInYear(api.getFilteredByGlob(watchingFiles), new Date().getUTCFullYear()));

  eleventyConfig.addCollection("watchedPreviousYears", (api) =>
    watchedBeforeYear(api.getFilteredByGlob(watchingFiles), new Date().getUTCFullYear()));

  // Every year with watched items, including this one: one archive page is built for each
  eleventyConfig.addCollection("watchedYears", (api) =>
    watchedByYear(api.getFilteredByGlob(watchingFiles)));

  // Reading, playing and listening collections: the same four as watching, one set per activity
  // e.g. collections.currentlyReading, readThisYear, readPreviousYears, readYears
  for (const activity of activities) {
    const files = activityGlob(activity.slug);
    const build = activityCollections(activity.listKey);

    eleventyConfig.addCollection(activity.names.currently, (api) =>
      build.currently(api.getFilteredByGlob(files)));

    eleventyConfig.addCollection(activity.names.thisYear, (api) =>
      build.inYear(api.getFilteredByGlob(files), new Date().getUTCFullYear()));

    eleventyConfig.addCollection(activity.names.previousYears, (api) =>
      build.beforeYear(api.getFilteredByGlob(files), new Date().getUTCFullYear()));

    eleventyConfig.addCollection(activity.names.years, (api) =>
      build.byYear(api.getFilteredByGlob(files)));
  }

  // Writing collections
  eleventyConfig.addCollection("writing", (api) =>
    newestFirst(api.getFilteredByGlob(writingFiles)));

  eleventyConfig.addCollection("writingYears", (api) =>
    writingYears(api.getFilteredByGlob(writingFiles)));

  eleventyConfig.addCollection("writingMonths", (api) =>
    writingMonths(api.getFilteredByGlob(writingFiles)));

  eleventyConfig.addCollection("writingTags", (api) =>
    writingTags(api.getFilteredByGlob(writingFiles)));

  // Root collections: every post in source/<slug>/ (speaking, celebrating, attending, now, making)
  // e.g. collections.speaking, collections.speakingYears, collections.speakingMonths
  for (const root of roots) {
    const files = rootGlob(root.slug);

    eleventyConfig.addCollection(root.slug, (api) =>
      newestFirst(api.getFilteredByGlob(files)));

    eleventyConfig.addCollection(yearsName(root.slug), (api) =>
      rootYears(api.getFilteredByGlob(files)));

    eleventyConfig.addCollection(monthsName(root.slug), (api) =>
      rootMonths(api.getFilteredByGlob(files)));
  }

  // Sending collections: every post in source/sending/<section>/ (likes, replies)
  eleventyConfig.addCollection("sending", (api) =>
    newestFirst(api.getFilteredByGlob(sendingAllGlob)));

  eleventyConfig.addCollection("sendingYears", (api) =>
    sendingYears(api.getFilteredByGlob(sendingAllGlob)));

  eleventyConfig.addCollection("sendingMonths", (api) =>
    sendingMonths(api.getFilteredByGlob(sendingAllGlob)));

  // One collection per section: collections.sendingLikes, collections.sendingReplies
  for (const section of sendingSections) {
    eleventyConfig.addCollection(sendingName(section.slug), (api) =>
      newestFirst(api.getFilteredByGlob(sendingGlob(section.slug))));
  }

  // The posts in /feed.xml, newest first: everything with a date of its own
  // (not watching, reading, playing or listening, whose dates are in lists)
  eleventyConfig.addCollection("feedable", (api) =>
    newestFirst([
      ...api.getFilteredByGlob(writingFiles),
      ...api.getFilteredByGlob(allGlob),
      ...api.getFilteredByGlob(sendingAllGlob),
      ...roots.flatMap((root) => api.getFilteredByGlob(rootGlob(root.slug))),
    ]));

  // The two site-wide feeds under /everything-everywhere-all-at-once/: every post in every collection.
  // everything = newest first by created date only (not sortDate); everythingUpdated = only posts with an "updated"
  // date, most recently updated first.
  eleventyConfig.addCollection("everything", (api) => createdFirst(taggablePosts(api)));
  eleventyConfig.addCollection("everythingUpdated", (api) => updatedFirst(taggablePosts(api)));

  // Collecting collections: every post in source/collecting/<section>/
  eleventyConfig.addCollection("collecting", (api) =>
    newestFirst(api.getFilteredByGlob(allGlob)));

  eleventyConfig.addCollection("collectingYears", (api) =>
    collectingYears(api.getFilteredByGlob(allGlob)));

  eleventyConfig.addCollection("collectingMonths", (api) =>
    collectingMonths(api.getFilteredByGlob(allGlob)));

  // Tags across every post: writing, collecting, the root collections, watching, and reading/playing/listening.
  // One /tagging/{tag}/ page each.
  eleventyConfig.addCollection("allTags", (api) => writingTags(taggablePosts(api)));

  // Every post that can be suggested by the related content component (macros/related.html).
  // The same posts as allTags: collections.relatable
  eleventyConfig.addCollection("relatable", (api) => newestFirst(taggablePosts(api)));

  // One collection per section: collections.collectingCycles, collections.collectingLinks, ...
  for (const section of sections) {
    eleventyConfig.addCollection(collectionName(section.slug), (api) =>
      newestFirst(api.getFilteredByGlob(globFor(section.slug))));
  }

  // The section list, for the navigation: {{ collectingSections }}
  eleventyConfig.addGlobalData("collectingSections", sections);

  // The sending section list, for the navigation: {{ sendingSections }}
  eleventyConfig.addGlobalData("sendingSections", sendingSections);

  // Available in every template as {{ currentYear }}
  eleventyConfig.addGlobalData("currentYear", () => new Date().getUTCFullYear());

  // Date filters (UTC, so dates don't shift an hour in British Summer Time)
  eleventyConfig.addFilter("isoDate", (d) => asDate(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter("longDate", (d) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(asDate(d)));

  // With the time: "2025-01-10T16:32:10.851Z" and "10 January 2025, 16:32 UTC"
  eleventyConfig.addFilter("isoDateTime", (d) => asDate(d).toISOString());
  eleventyConfig.addFilter("longDateTime", (d) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(asDate(d)));

  // 2025-01-10T16:32:10Z -> "20250110163210": the end of /sending/likes/2025/01/like_20250110163210/
  eleventyConfig.addFilter("stamp", stamp);

  // "/writing/a-post/" -> "https://benjamin.parry.is/writing/a-post/"
  eleventyConfig.addFilter("absoluteUrl", (path) =>
    /^https?:\/\//i.test(path) ? path : `${site.url}${String(path).startsWith("/") ? "" : "/"}${path}`);

  // Used to build /writing/yyyy/mm/post-name/ and /tagging/tag-name/ URLs
  eleventyConfig.addFilter("yearOf", yearOf);
  eleventyConfig.addFilter("monthOf", monthOf);
  eleventyConfig.addFilter("tagSlug", slugify);

  // "https://www.rowboat.net/product/" -> "rowboat.net"
  eleventyConfig.addFilter("hostname", hostname);

  // post.cover | coverSrc("reading", post.fileSlug) -> the cover image for reading/playing/listening
  eleventyConfig.addFilter("coverSrc", coverSrc);

  // pool | related(page, { limit: 3, tags: true, category: true, featured: "prefer" })
  // Used by macros/related.html
  eleventyConfig.addFilter("related", related);

  // pool | onThisDay(page, { onThisDay: true, onThisDayLimit: 3 })
  // Used by macros/related.html
  eleventyConfig.addFilter("onThisDay", onThisDay);

  // webmentions | webmentionsFor(page.url, { types: [...], aliases: [...] })  -> this page's mentions, newest first
  // mentions | webmentionSummary                                             -> { total, breakdown }
  // Used by macros/webmentions.html
  eleventyConfig.addFilter("webmentionsFor", (mentions, pageUrl, options = {}) =>
    webmentionsFor(mentions, pageUrl, { ...options, siteUrl: site.url }));
  eleventyConfig.addFilter("webmentionSummary", summariseWebmentions);

  // post | feedContent -> the HTML for a feed entry (used by partials/atom-feed.njk)
  eleventyConfig.addFilter("feedContent", feedContent);

  // The "updated" front matter as [{ date, comment }] newest first; the date a feed entry is ordered by;
  // and which part of the site a post is in ({ title, url })
  eleventyConfig.addFilter("updatesOf", updatesOf);
  eleventyConfig.addFilter("feedDate", feedDate);
  eleventyConfig.addFilter("partOf", partOf);
}

// Set template engines
export const config = {
  markdownTemplateEngine: 'njk',
  htmlTemplateEngine: 'njk',
};
