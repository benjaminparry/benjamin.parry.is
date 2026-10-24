// Data for every post in source/reading/.
// Written as JavaScript (rather than reading.json like the collecting folders) because the list of
// reads is worked out:
// `activity` is the `read:` list from the front matter, or a top-level started / completed pair.
import { entriesOf } from "../../_config/activity.js";

export default {
  layout: "layouts/reading-item.html",
  collection: "reading",
  collectionTitle: "Reading",
  // The dates that matter are in the read list, not the file name, so feeds don't show a post date
  showDate: false,
  permalink: "/reading/{{ page.fileSlug }}/",
  eleventyComputed: {
    activity: (data) => entriesOf(data, "read"),
  },
};
