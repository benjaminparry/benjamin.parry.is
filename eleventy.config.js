import { currentlyWatching, allWatched, watchedByYear, watchedInYear, watchedBeforeYear } from "./_config/watching.js";
import { slugify, yearOf, monthOf, newestFirst, writingYears, writingMonths, writingTags } from "./_config/writing.js";
import { sections, collectionName, globFor, allGlob, collectingYears, collectingMonths, hostname } from "./_config/collecting.js";

// Every Markdown file directly inside source/watching/ is a watched item
const watchingFiles = "source/watching/*.md";

// Every Markdown file directly inside source/writing/ is a writing post
const writingFiles = "source/writing/*.md";

export default function (eleventyConfig) {

  // Set source and build directories
  eleventyConfig.setInputDirectory('source');
  eleventyConfig.setOutputDirectory('build');

  // Set directories to pass through to build directory
  eleventyConfig.addPassthroughCopy('source/assets/images');

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

  // Writing collections
  eleventyConfig.addCollection("writing", (api) =>
    newestFirst(api.getFilteredByGlob(writingFiles)));

  eleventyConfig.addCollection("writingYears", (api) =>
    writingYears(api.getFilteredByGlob(writingFiles)));

  eleventyConfig.addCollection("writingMonths", (api) =>
    writingMonths(api.getFilteredByGlob(writingFiles)));

  eleventyConfig.addCollection("writingTags", (api) =>
    writingTags(api.getFilteredByGlob(writingFiles)));

  // Collecting collections: every post in source/collecting/<section>/
  eleventyConfig.addCollection("collecting", (api) =>
    newestFirst(api.getFilteredByGlob(allGlob)));

  eleventyConfig.addCollection("collectingYears", (api) =>
    collectingYears(api.getFilteredByGlob(allGlob)));

  eleventyConfig.addCollection("collectingMonths", (api) =>
    collectingMonths(api.getFilteredByGlob(allGlob)));

  // Tags across writing AND collecting posts: one /tagging/{tag}/ page each
  eleventyConfig.addCollection("allTags", (api) =>
    writingTags([...api.getFilteredByGlob(writingFiles), ...api.getFilteredByGlob(allGlob)]));

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
  eleventyConfig.addFilter("isoDate", (d) => d.toISOString().slice(0, 10));
  eleventyConfig.addFilter("longDate", (d) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d));

  // Used to build /writing/yyyy/mm/post-name/ and /tagging/tag-name/ URLs
  eleventyConfig.addFilter("yearOf", yearOf);
  eleventyConfig.addFilter("monthOf", monthOf);
  eleventyConfig.addFilter("tagSlug", slugify);

  // "https://www.rowboat.net/product/" -> "rowboat.net"
  eleventyConfig.addFilter("hostname", hostname);
}

// Set template engines
export const config = {
  markdownTemplateEngine: 'njk',
  htmlTemplateEngine: 'njk',
};
