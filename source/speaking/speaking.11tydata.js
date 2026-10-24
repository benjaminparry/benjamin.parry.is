// Data for every post in source/speaking/.
// Written as JavaScript (rather than speaking.json like the other folders) because two values are worked out:
//   entryType  "event" (in person) or "media" (a recording). Set `type:` in the front matter to choose,
//              otherwise a post with a bookmarkOf or a mirror is media and anything else is an event.
//   mirrorKind "audio" or "video", from the file extension of `mirror`, so the right player is shown.
import { speakingType, mediaKind } from "../../_config/roots.js";

export default {
  layout: "layouts/speaking-post.html",
  collection: "speaking",
  collectionTitle: "Speaking",
  permalink: "/speaking/{{ page.date | yearOf }}/{{ page.date | monthOf }}/{{ page.fileSlug }}/",
  eleventyComputed: {
    entryType: (data) => speakingType(data),
    mirrorKind: (data) => mediaKind(data.mirror),
  },
};
