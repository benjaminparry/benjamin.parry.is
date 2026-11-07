// Data for every artist in source/listening/artists/ (see _config/artists.js).
// Written as JavaScript because the listened list and the sort date are worked out from `performances:`.
import { liveEntries } from "../../../_config/artists.js";
import { sortDateOf } from "../../../_config/activity.js";

export default {
  layout: "layouts/listening-artist.html",
  collection: "listening",
  collectionTitle: "Listening",
  // Shown as live in the lists: see listened-entry.html
  listeningKind: "live",
  // The dates that matter are in the performances, not the file name
  showDate: false,
  permalink: "/listening/artists/{{ page.fileSlug }}/",
  eleventyComputed: {
    // Joins the same lists as recorded music: this year, previous years and the year archives
    listened: (data) => liveEntries(data),
    // What the artist sorts by in tag pages and suggestions: the latest performance
    sortDate: (data) => sortDateOf(liveEntries(data)),
  },
};
