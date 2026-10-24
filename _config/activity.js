// Helpers for the /reading/, /playing/ and /listening/ collections.
// They work the same way as the /watching/ helpers (see watching.js) and return the same shapes,
// so the feed and archive templates can follow the /watching/ ones.
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// Each post has a list in its front matter, named after the activity:
//   read:     (reading)    played: (playing)    listened: (listening)
//     - date: 2026-01-02                            done in one sitting
//     - started: 2026-09-01                         under way right now
//     - started: 2025-02-01, finished: 2025-03-10   finished
//
// Playing posts can also use the simpler form on their own front matter:
//   started: 2026-05-29
//   completed: 2026-07-01      (leave empty while still playing)

// slug = the folder name and the URL segment. listKey = the front matter list.
// names = the collections registered for it (the same four /watching/ has, minus the unused one).
export const activities = [
  {
    slug: "reading",
    title: "Reading",
    listKey: "read",
    names: { currently: "currentlyReading", thisYear: "readThisYear", previousYears: "readPreviousYears", years: "readYears" },
  },
  {
    slug: "playing",
    title: "Playing",
    listKey: "played",
    names: { currently: "currentlyPlaying", thisYear: "playedThisYear", previousYears: "playedPreviousYears", years: "playedYears" },
  },
  {
    slug: "listening",
    title: "Listening",
    listKey: "listened",
    names: { currently: "currentlyListening", thisYear: "listenedThisYear", previousYears: "listenedPreviousYears", years: "listenedYears" },
  },
];

export const activityGlob = (slug) => `source/${slug}/*.md`;

const toDate = (value) => (value ? new Date(value) : null); // accepts a Date or "2026-01-02"

// The list of reads / plays / listens for a post, from its front matter data.
// Falls back to a top-level started / completed (or finished) pair, as used in playing posts.
export function entriesOf(data, listKey) {
  if (Array.isArray(data[listKey])) return data[listKey];
  const finished = data.finished ?? data.completed;
  if (data.started || finished) return [{ started: data.started, finished }];
  return [];
}

// An entry is complete once it has a finished date or a single-sitting date
const isComplete = (entry) => Boolean(entry.finished ?? entry.date);

// An entry is in progress if it has been started but not completed
const isInProgress = (entry) => Boolean(entry.started) && !isComplete(entry);

// The date a completed entry counts for
const entryDate = (entry) => toDate(entry.finished ?? entry.date);

// Returns the four collection builders for one activity.
export function activityCollections(listKey) {
  const list = (item) => entriesOf(item.data, listKey);

  // Items with at least one entry in progress, most recently started first
  const currently = (items) => {
    const latestStart = (item) =>
      Math.max(...list(item).filter(isInProgress).map((e) => toDate(e.started)));

    return items
      .filter((item) => list(item).some(isInProgress))
      .sort((a, b) => latestStart(b) - latestStart(a));
  };

  // One entry per item for every year it was completed, grouped by year (newest year first):
  //   [{ year: 2026, entries: [{ item, latest, count }, ...], awarded: [...], others: 3 }, { year: 2025, ... }]
  //
  // - awarded: the entries whose post has an `award`
  // - others:  how many entries are not awarded (entries minus awarded)
  // - latest:  the item's most recent completed entry *within that year*
  // - count:   every completed entry, ever (all years)
  const byYear = (items) => {
    const years = new Map();

    for (const item of items) {
      const done = list(item).filter(isComplete);
      if (!done.length) continue;

      const latestPerYear = new Map();
      for (const entry of done) {
        const date = entryDate(entry);
        const year = date.getUTCFullYear();
        if (!latestPerYear.has(year) || date > latestPerYear.get(year)) latestPerYear.set(year, date);
      }

      for (const [year, latest] of latestPerYear) {
        if (!years.has(year)) years.set(year, []);
        years.get(year).push({ item, latest, count: done.length });
      }
    }

    return [...years]
      .map(([year, entries]) => {
        entries.sort((a, b) => b.latest - a.latest);
        const awarded = entries.filter((entry) => entry.item.data.award);
        return { year, entries, awarded, others: entries.length - awarded.length };
      })
      .sort((a, b) => b.year - a.year);
  };

  // The entries for one year (an empty list if nothing was completed that year)
  const inYear = (items, year) => byYear(items).find((group) => group.year === year)?.entries ?? [];

  // Every year before the given year, each with its entries
  const beforeYear = (items, year) => byYear(items).filter((group) => group.year < year);

  return { currently, byYear, inYear, beforeYear };
}
