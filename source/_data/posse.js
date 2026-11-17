// posse: Publish (on your) Own Site, Syndicate Elsewhere. Settings for scripts/posse.mjs. See docs/posse.md.
// Secrets (tokens, passwords) are NOT kept here. They are GitHub secrets.
export default {
  // Which feeds to look in: the names of Eleventy collections. "feedable" is everything in /feed.xml.
  // Narrow it with, say, ["writing", "thoughts"].
  feeds: ["feedable"],

  // Posts older than this many days are never sent, so turning this on can't flood your timelines.
  // Override for one run with --allow-old.
  maxAgeDays: 7,

  language: "en",

  mastodon: {
    enabled: true,
    instance: "https://mastodon.social",
    visibility: "public",     // public | unlisted | private
    limit: 500,               // characters. Links count as 23 whatever their length.
  },

  bluesky: {
    enabled: true,
    service: "https://bsky.social",
    identifier: "benjaminparry.bsky.social",           // your handle, e.g. "yourname.bsky.social"
    limit: 300,
  },

  linkedin: {
    enabled: true,
    version: "202610",        // LinkedIn's API version, YYYYMM. Change it when LinkedIn retires this one.
    limit: 3000,
  },
};
