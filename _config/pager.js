// Which page numbers to show in the pagination links.
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// With limit = 3 and 30 pages, on page 1:   1 2 3 … 28 29 30
//                                on page 15: 1 2 3 … 14 15 16 … 28 29 30
// `limit` is how many links to show at each end. The page you are on, and the pages either side of it,
// are always shown. A gap of a single page is filled with that page rather than a "…".
// With limit * 2 pages or fewer (6 with the default) every page is shown.
//
// Returns numbers (1-based) with null where the "…" goes: [1, 2, 3, null, 28, 29, 30]

export function pageWindow(total, current, limit = 3) {
  const pages = Math.max(0, Math.floor(Number(total)) || 0);
  const end = Math.max(1, Math.floor(Number(limit)) || 3);   // 0, negative or nonsense falls back to 3
  const all = Array.from({ length: pages }, (_, i) => i + 1);
  if (pages <= end * 2) return all;

  const here = Math.min(Math.max(Math.floor(Number(current)) || 1, 1), pages);
  const shown = new Set([
    ...all.slice(0, end),
    ...all.slice(-end),
    here - 1, here, here + 1,
  ].filter((n) => n >= 1 && n <= pages));

  const result = [];
  let previous = 0;
  for (const n of [...shown].sort((a, b) => a - b)) {
    if (n - previous === 2) result.push(previous + 1);   // one page missing: show it, not a "…"
    else if (n - previous > 2) result.push(null);
    result.push(n);
    previous = n;
  }
  return result;
}

// For templates: the window for an Eleventy pagination object
export const pageWindowFor = (pagination, limit = 3) =>
  pageWindow(pagination?.hrefs?.length ?? 0, (pagination?.pageNumber ?? 0) + 1, limit);
