// Works out the pictures for every post in this folder. To use them on another kind of post, copy this file into
// that folder and keep the same name for `mediaSet` (the layouts and the feed look for it).
import { resolveMedia } from "../../_config/images.js";

export default {
  eleventyComputed: {
    mediaSet: (data) => resolveMedia(data),
  },
};
