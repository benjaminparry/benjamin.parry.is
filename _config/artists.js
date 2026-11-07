// Helpers for artists in /listening/: the people you have seen live.
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// An artist is a file in source/listening/artists/, named after them (the-wameki.md). Its front matter holds
// the live performances. There is no overall rating for an artist: each performance has its own review.
//
//   title: THE WAMEKI
//   cover: the-wameki-live-rossi-bar-2026.jpg     (optional, in /assets/images/listening/)
//   performances:
//     - date: 2026-11-06
//       venue: The Rossi Bar, Brighton
//       rating: 4                                (optional, out of 5)
//       comment: Loud and brilliant.             (optional)
//       award: true                              (optional)
//
// Recorded music stays where it was (source/listening/new-games.md) and says who made it with `artist: Goat (jp)`.
// A recording belongs to an artist page when the artist's name, written as a web address, is the artist file's name:
//   "THE WAMEKI" -> the-wameki      "Goat (jp)" -> goat-jp

import { slugify } from "./writing.js";

export const artistSlug = (name) => slugify(name ?? "");

const toDate = (value) => (value instanceof Date ? value : new Date(value));

// The performances in a post's front matter, newest first. Entries without a usable date are left out.
export function performancesOf(data) {
  const list = Array.isArray(data?.performances) ? data.performances : [];
  return list
    .filter((p) => p && p.date && !Number.isNaN(toDate(p.date).getTime()))
    .map((p) => ({ ...p, date: toDate(p.date) }))
    .sort((a, b) => b.date - a.date);
}

// The same performances in the shape the listening lists use (see activity.js: `listened`).
// Each one is a single-sitting entry (it has a date), and carries its venue, rating, comment and award along.
export const liveEntries = (data) => performancesOf(data);

// The recorded posts made by one artist (pass the artist file's slug), newest first.
export function recordingsBy(posts = [], slug) {
  const sortDate = (post) => new Date(post.data?.sortDate ?? 0).getTime();
  return posts
    .filter((post) => post.data?.artist && artistSlug(post.data.artist) === slug)
    .sort((a, b) => sortDate(b) - sortDate(a));
}

// The artist page for a name, or undefined when there is no artist file for it
export const artistPage = (name, artists = []) =>
  name ? artists.find((artist) => artist.fileSlug === artistSlug(name)) : undefined;
