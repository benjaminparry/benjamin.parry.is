// Data for every post in source/watching/.
// Written as JavaScript (rather than watching.json) because sortDate is worked out from the watched list.
import { sortDateOf } from "../../_config/activity.js";

export default {
  layout: "layouts/watching-item.html",
  // Lets tag pages and suggestions list a watched item like any other post
  collection: "watching",
  collectionTitle: "Watching",
  // The dates that matter are in the watched list, not the file name, so feeds don't show a post date
  showDate: false,
  permalink: "/watching/{{ page.fileSlug }}/",
  eleventyComputed: {
    // What the post sorts by in tag pages and suggestions: its latest watch (or start) date
    sortDate: (data) => sortDateOf(data.watched ?? []),
  },
};
