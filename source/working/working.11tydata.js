// Data for every project in source/working/ (the .md files directly inside it).
//
// The URL and the date of a project come from its own front matter, never from its file name, so files can be
// renamed freely:   /working/yyyy/mm/title/   where yyyy/mm is `start` (or `date`) and title is `slug:` or `title:`.
// These are computed, so they also replace any `permalink:` left in a file's front matter (`permalink: false`
// was used to switch pages off). To unpublish a project use `hidden: true` instead.
//
// Files in the folders inside this one (history/, organisations/) are data for the model in _config/working.js.
// They never get a page of their own: the pages are in source/working-pages/.
import { projectPermalink, parseDate } from "../../_config/working.js";

const isProject = (data) => /^\.?\/?source\/working\/[^/]+\.md$/.test(data.page?.inputPath ?? "");

export default {
  layout: "layouts/working-project.html",
  collection: "working",
  collectionTitle: "Working",
  eleventyComputed: {
    permalink: (data) => (isProject(data) ? projectPermalink(data, data.page?.date, data.page?.fileSlug) : false),
    // What archives, feeds, tags and "on this day" sort a project by: when it started
    sortDate: (data) => (isProject(data) ? parseDate(data.start ?? data.date)?.date ?? undefined : undefined),
  },
};
