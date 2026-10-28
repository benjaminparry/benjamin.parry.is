// Helpers for the root-level collections (speaking, celebrating, attending, now, making, working).
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// Posts live in source/<slug>/ and are named with their date:
//   source/speaking/2025-04-26-ux-camp-brighton-2025-fed-by-the-trolls.md
// and are published at /<slug>/yyyy/mm/post-name/.
// The year and month grouping is the same as for writing, so those helpers are reused.

import { newestFirst, writingYears, writingMonths } from "./writing.js";

// slug = the folder name and the URL segment. title = the heading shown on the site.
// Add a line here (plus a folder with the same set of templates) to add another root collection.
export const roots = [
  { slug: "speaking", title: "Speaking" },
  { slug: "celebrating", title: "Celebrating" },
  { slug: "attending", title: "Attending" },
  { slug: "now", title: "Now" },
  { slug: "making", title: "Making" },
  { slug: "working", title: "Working" },   // projects; the people and places behind them are in working.js
];

export const rootGlob = (slug) => `source/${slug}/*.md`;

// "speaking" -> "speakingYears", "speakingMonths"
export const yearsName = (slug) => `${slug}Years`;
export const monthsName = (slug) => `${slug}Months`;

// Reuse the year and month grouping used for writing
export const rootYears = writingYears;
export const rootMonths = writingMonths;
export { newestFirst };

// A speaking post is either:
//   event - something I spoke at in person
//   media - a recording, linked at its original home (bookmarkOf) and mirrored on this site (mirror)
// Set `type: event` or `type: media` in the front matter, or leave it out and it is worked out:
// anything with a bookmarkOf or a mirror is media, everything else is an event.
export function speakingType(data) {
  if (data.type === "event" || data.type === "media") return data.type;
  return data.bookmarkOf || data.mirror ? "media" : "event";
}

// "/assets/audio/mirroring/talk.mp3" -> "audio", ".../talk.mp4" -> "video", anything else -> null
export function mediaKind(path) {
  const ext = String(path ?? "").split(/[?#]/)[0].split(".").pop().toLowerCase();
  if (["mp3", "m4a", "ogg", "oga", "wav", "flac", "aac"].includes(ext)) return "audio";
  if (["mp4", "webm", "mov", "m4v", "ogv"].includes(ext)) return "video";
  return null;
}
