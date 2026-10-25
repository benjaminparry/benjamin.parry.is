// Data for every post in source/listening/.
// Written as JavaScript (rather than listening.json like the collecting folders) because the list of
// listens is worked out:
// `activity` is the `listened:` list from the front matter, or a top-level started / completed pair.
import { entriesOf, sortDateOf } from "../../_config/activity.js";

export default {
  layout: "layouts/listening-item.html",
  collection: "listening",
  collectionTitle: "Listening",
  // The dates that matter are in the listened list, not the file name, so feeds don't show a post date
  showDate: false,
  permalink: "/listening/{{ page.fileSlug }}/",
  eleventyComputed: {
    activity: (data) => entriesOf(data, "listened"),
    // What the post sorts by in tag pages and suggestions: its latest completed (or started) date
    sortDate: (data) => sortDateOf(entriesOf(data, "listened")),
  },
};
