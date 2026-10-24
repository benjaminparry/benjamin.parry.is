// Data for every post in source/playing/.
// Written as JavaScript (rather than playing.json like the collecting folders) because the list of
// plays is worked out:
// `activity` is the `played:` list from the front matter, or a top-level started / completed pair.
import { entriesOf } from "../../_config/activity.js";

export default {
  layout: "layouts/playing-item.html",
  collection: "playing",
  collectionTitle: "Playing",
  // The dates that matter are in the played list, not the file name, so feeds don't show a post date
  showDate: false,
  permalink: "/playing/{{ page.fileSlug }}/",
  eleventyComputed: {
    activity: (data) => entriesOf(data, "played"),
  },
};
