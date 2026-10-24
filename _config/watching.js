// Helpers for the /watching/ collections.
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// Each post has a `watched` list in its front matter:
//   - date: 2026-01-02                         a film or play, watched in one sitting
//   - started: 2026-09-01                      a series being watched right now
//   - started: 2025-02-01, finished: 2025-03-10   a series that has been finished

const toDate = (value) => (value ? new Date(value) : null); // accepts a Date or "2026-01-02"

// A watch is complete once it has a finished date or a single-sitting date
const isComplete = (watch) => Boolean(watch.finished ?? watch.date);

// A watch is in progress if it has been started but not completed
const isInProgress = (watch) => Boolean(watch.started) && !isComplete(watch);

// The date a completed watch counts for
const watchDate = (watch) => toDate(watch.finished ?? watch.date);

// Items with at least one watch in progress, most recently started first
export function currentlyWatching(items) {
  const latestStart = (item) =>
    Math.max(...(item.data.watched ?? []).filter(isInProgress).map((w) => toDate(w.started)));

  return items
    .filter((item) => (item.data.watched ?? []).some(isInProgress))
    .sort((a, b) => latestStart(b) - latestStart(a));
}

export function allWatched(items) {
  const summaries = [];

  for (const item of items) {
    const done = (item.data.watched ?? []).filter(isComplete);
    if (!done.length) continue;

    const latest = new Date(Math.max(...done.map(watchDate)));
    summaries.push({ item, latest, count: done.length });
  }

  return summaries.sort((a, b) => b.latest - a.latest);
}

// One entry per item for every year it was watched, grouped by year (newest year first):
//   [{ year: 2026, entries: [{ item, latest, count }, ...], awarded: [...], others: 3 }, { year: 2025, ... }]
//
// - awarded: the entries whose post has an `award`
// - others:  how many entries are not awarded (entries minus awarded)
//
// - latest: the item's most recent completed watch *within that year*
// - count:  every completed watch, ever (all years), so a film watched twice a year
//           for three years has a count of 6 in each year's list
export function watchedByYear(items) {
  const years = new Map();

  for (const item of items) {
    const done = (item.data.watched ?? []).filter(isComplete);
    if (!done.length) continue;

    // the latest watch in each year this item was watched
    const latestPerYear = new Map();
    for (const watch of done) {
      const date = watchDate(watch);
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
}

// The entries for one year (an empty list if nothing was watched that year)
export function watchedInYear(items, year) {
  return watchedByYear(items).find((group) => group.year === year)?.entries ?? [];
}

// Every year before the given year, each with its entries
export function watchedBeforeYear(items, year) {
  return watchedByYear(items).filter((group) => group.year < year);
}
