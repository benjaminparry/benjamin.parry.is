// Helpers for the podcast feed (/collecting/podcasts/feed.rss).
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.

// The file type of an episode, worked out from its address. The query string is ignored:
//   "https://example.com/ep.mp3?aid=rss_feed" -> "audio/mpeg"
const types = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
};

export function audioType(url) {
  let path = String(url);
  try {
    path = new URL(url).pathname;
  } catch {
    // not a full address: use it as it is
  }
  const extension = path.split(".").pop().toLowerCase();
  return types[extension] ?? "audio/mpeg";   // most podcast audio is mp3
}

// RSS wants dates written like "Sat, 09 May 2026 00:00:00 GMT"
export const rfc822 = (date) => (date instanceof Date ? date : new Date(date)).toUTCString();
