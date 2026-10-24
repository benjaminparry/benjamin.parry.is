import { currentlyWatching, allWatched, watchedByYear, watchedInYear, watchedBeforeYear } from "./_config/watching.js";
import { slugify, yearOf, monthOf, newestFirst, writingYears, writingMonths, writingTags } from "./_config/writing.js";
import { sections, collectionName, globFor, allGlob, collectingYears, collectingMonths, hostname } from "./_config/collecting.js";
import { roots, rootGlob, yearsName, monthsName, rootYears, rootMonths } from "./_config/roots.js";
import { activities, activityGlob, activityCollections, coverSrc } from "./_config/activity.js";
import { related } from "./_config/related.js";

// Every Markdown file directly inside source/watching/ is a watched item
const watchingFiles = "source/watching/*.md";

// Every Markdown file directly inside source/writing/ is a writing post
const writingFiles = "source/writing/*.md";

// Tolerates a Date or a date written as text ("2026-01-02")
const asDate = (d) => (d instanceof Date ? d : new Date(d));

// Every post that has tags or a category: writing, collecting, the root collections,
// and reading/playing/listening. Watching items don't have tags (yet), so they are left out.
const taggablePosts = (api) => [
  ...api.getFilteredByGlob(writingFiles),
  ...api.getFilteredByGlob(allGlob),
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

  // Collecting collections: every post in source/collecting/<section>/
  eleventyConfig.addCollection("collecting", (api) =>
    newestFirst(api.getFilteredByGlob(allGlob)));

  eleventyConfig.addCollection("collectingYears", (api) =>
    collectingYears(api.getFilteredByGlob(allGlob)));

  eleventyConfig.addCollection("collectingMonths", (api) =>
    collectingMonths(api.getFilteredByGlob(allGlob)));

  // Tags across every post: writing, collecting, the root collections, and reading/playing/listening.
  // One /tagging/{tag}/ page each. Watching items don't have tags (yet), so they are left out.
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

  // Available in every template as {{ currentYear }}
  eleventyConfig.addGlobalData("currentYear", () => new Date().getUTCFullYear());

  // Date filters (UTC, so dates don't shift an hour in British Summer Time)
  eleventyConfig.addFilter("isoDate", (d) => asDate(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter("longDate", (d) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(asDate(d)));

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
}

// Set template engines
export const config = {
  markdownTemplateEngine: 'njk',
  htmlTemplateEngine: 'njk',
};
