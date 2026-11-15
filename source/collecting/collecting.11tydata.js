// Directory data for everything in /collecting/ (thoughts, cycles, photos, ideas, links, lists, podcasts).
// Works out each post's pictures once, so layouts, lists and feeds can use  mediaSet.
import { resolveMedia } from "../../_config/images.js";

export default {
  ogType: "article",
  eleventyComputed: {
    mediaSet: (data) => resolveMedia(data),
  },
};
