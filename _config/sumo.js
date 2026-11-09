// Helpers for the sumo bingo cards in /making/ (see source/_data/basho/ for the data).
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// One data file per basho, e.g. source/_data/basho/2026-11.json:
//   {
//     "id": "2026-11",  "start": "2026-11-08",  "end": "2026-11-22",  "days": 15,
//     "city": "Fukuoka",  "venue": "Fukuoka Kokusai Center",  "venueUrl": "https://maps...",
//     "sumokaboom": { "id": "212", "url": "https://..." },
//     "card": ["tokihayate", "kotoshoho", ... 25 ids, top left to bottom right, row by row],
//     "yusho": "onosato",                        (the winner, once known)
//     "rikishi": {
//       "onosato": { "name": "Onosato", "results": "wwwlwwwwwlwwlww", "playoff": 1 },
//       ...
//     }
//   }
//
// `card` is yours. `rikishi` is what a scraper may fill in (see mergeResults). Totals, winning and losing squares
// and bingo lines are all worked out from `results`, so there is nothing to keep in step by hand.
//
// results is one character for each day of the basho:
//   w  won (including a win because the opponent pulled out)
//   l  lost
//   f  forfeited: pulled out injured, so the day was lost by default
//   a  absent: did not take part
//   r  retired
//   -  not fought yet
// A basho entered before this system was made may only have totals: "record": { "wins": 6, "losses": 4 } instead.

import { slugify } from "./writing.js";

export const rikishiId = (name) => slugify(name ?? "");

export const CODES = { w: "win", l: "loss", f: "forfeit", a: "absent", r: "retired", "-": "not yet fought" };

// The class names the stylesheet already uses (result--lose, rikishi--no-result-yet ...)
const RESULT_CLASS = { w: "win", l: "lose", f: "forfeit", a: "forfeit", r: "retire", "-": "pending" };
const STATE_CLASS = { "kachi-koshi": "kachi-koshi", "make-koshi": "make-koshi", out: "no-result-yet", pending: "no-result-yet" };

const num = (value) => Number(value) || 0;
const toDate = (value) => (value instanceof Date ? value : new Date(value));

// How many wins make a kachi-koshi (a majority of the days): 8 of 15
export const winsNeeded = (days = 15) => Math.floor(days / 2) + 1;

// What a rikishi's days add up to. Uses the daily results when there are any, otherwise the totals-only `record`.
export function recordOf(entry = {}, days = 15) {
  const results = String(entry.results ?? "");
  const hasDaily = /[wlfar]/.test(results);
  if (!hasDaily && entry.record) {
    const { wins = 0, losses = 0, forfeits = 0, retired = 0 } = entry.record;
    const played = num(wins) + num(losses) + num(forfeits) + num(retired);
    return { wins: num(wins), losses: num(losses), forfeits: num(forfeits), retired: num(retired), pending: Math.max(days - played, 0), daily: false };
  }
  const count = (code) => [...results].filter((c) => c === code).length;
  // "f" and "a" are both days the rikishi was out of the basho without being retired
  const out = count("f") + count("a");
  const pending = Math.max(days - (count("w") + count("l") + out + count("r")), 0);
  return { wins: count("w"), losses: count("l"), forfeits: out, retired: count("r"), pending, daily: hasDaily };
}

// The state of a square on the card:
//   kachi-koshi  a winning square (8 wins)
//   make-koshi   a losing square (8 losses)
//   out          can no longer win: pulled out injured, absent or retired (a "dead" square)
//   pending      still to be decided
export function stateOf(record, days = 15) {
  const needed = winsNeeded(days);
  if (record.wins >= needed) return "kachi-koshi";
  if (record.losses >= needed) return "make-koshi";
  if (record.forfeits > 0 || record.retired > 0) return "out";
  return "pending";
}

// The side-stacked bar: wins fill in from the left, losses from the right, days still to come sit in the
// space between, and days out (forfeited or retired) grow from the centre.
// Returns one of "win" | "loss" | "out" | "pending" for each day, left to right.
export function recordBar(record, days = 15) {
  const wins = Math.min(record.wins, days);
  const losses = Math.min(record.losses, days - wins);
  const out = Math.min(record.forfeits + record.retired, days - wins - losses);
  const cells = Array(days).fill("pending");
  for (let i = 0; i < wins; i++) cells[i] = "win";
  for (let i = 0; i < losses; i++) cells[days - 1 - i] = "loss";
  // the free space is between the wins and the losses: put the days out as close to the middle as it allows
  const middle = (days - 1) / 2;
  const start = Math.min(Math.max(Math.floor(middle - (out - 1) / 2), wins), days - losses - out);
  for (let i = 0; i < out; i++) cells[start + i] = "out";
  return cells;
}

// The days in order, as words for a screen reader: "win, loss, win, then 6 days not yet fought"
export function describeResults(results = "") {
  const text = String(results);
  const played = text.replace(/-+$/, "");
  const waiting = text.length - played.length;
  const words = [...played].map((c) => CODES[c] ?? "unknown");
  if (waiting) words.push(`then ${waiting} day${waiting === 1 ? "" : "s"} not yet fought`);
  return words.join(", ");
}

// The 25 squares are read left to right, top to bottom. A line is five squares in a row that are all winning
// or all losing: across, down, or corner to corner. Returns every line that is complete.
const LINES = [
  ...[0, 1, 2, 3, 4].map((r) => ({ direction: "row", number: r + 1, cells: [0, 1, 2, 3, 4].map((c) => r * 5 + c) })),
  ...[0, 1, 2, 3, 4].map((c) => ({ direction: "column", number: c + 1, cells: [0, 1, 2, 3, 4].map((r) => r * 5 + c) })),
  { direction: "diagonal", number: 1, name: "top left to bottom right", cells: [0, 6, 12, 18, 24] },
  { direction: "diagonal", number: 2, name: "top right to bottom left", cells: [4, 8, 12, 16, 20] },
];

export function bingoLines(states) {
  if (states.length !== 25) return [];
  return LINES.flatMap((line) => {
    const wanted = states[line.cells[0]];
    if (wanted !== "kachi-koshi" && wanted !== "make-koshi") return [];
    if (!line.cells.every((cell) => states[cell] === wanted)) return [];
    const type = wanted === "kachi-koshi" ? "winning" : "losing";
    const where = line.direction === "diagonal" ? `diagonal, ${line.name}` : `${line.direction} ${line.number}`;
    return [{ type, direction: line.direction, number: line.number, cells: line.cells, label: `${type} ${where}` }];
  });
}

const monthName = (date) => new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(date);

// Problems with a basho's data, as sentences. The build only warns about them.
export function problemsWith(basho) {
  const problems = [];
  const days = basho.days ?? 15;
  const card = basho.card ?? [];
  const rikishi = basho.rikishi ?? {};
  if (card.length !== 25) problems.push(`the card has ${card.length} squares, not 25`);
  const seen = new Set();
  for (const id of card) {
    if (seen.has(id)) problems.push(`"${id}" is on the card twice`);
    seen.add(id);
    if (!rikishi[id]) problems.push(`"${id}" is on the card but has no entry in rikishi`);
  }
  for (const [id, entry] of Object.entries(rikishi)) {
    const results = String(entry.results ?? "");
    if (results && results.length !== days) problems.push(`${id}: results has ${results.length} days, not ${days}`);
    if (/[^wlfar-]/.test(results)) problems.push(`${id}: results has a character other than w l f a r -`);
  }
  if (basho.yusho && !rikishi[basho.yusho]) problems.push(`the winner "${basho.yusho}" is not in rikishi`);
  return problems;
}

// Everything a template needs to show one basho
export function bashoView(basho) {
  const days = basho.days ?? 15;
  const startDate = toDate(basho.start);
  const rikishi = basho.rikishi ?? {};

  const squares = (basho.card ?? []).map((id, index) => {
    const entry = rikishi[id] ?? { name: id };
    const record = recordOf(entry, days);
    const state = stateOf(record, days);
    const results = String(entry.results ?? "");
    const parts = [record.wins, record.losses, ...(record.forfeits ? [record.forfeits] : [])];
    return {
      id,
      name: entry.name ?? id,
      index,
      row: Math.floor(index / 5) + 1,
      column: (index % 5) + 1,
      record,
      state,
      stateClass: STATE_CLASS[state],
      yusho: basho.yusho === id,
      playoff: entry.playoff ?? null,
      // "11 / 3 (1)": wins / losses, then forfeits when there are any, then playoff wins
      score: parts.join(" / ") + (entry.playoff !== undefined && entry.playoff !== null ? ` (${entry.playoff})` : ""),
      scoreWords:
        `${record.wins} win${record.wins === 1 ? "" : "s"}, ${record.losses} loss${record.losses === 1 ? "" : "es"}` +
        (record.forfeits ? `, ${record.forfeits} day${record.forfeits === 1 ? "" : "s"} out` : "") +
        (record.retired ? ", retired" : ""),
      daily: record.daily ? [...results].map((c) => ({ code: c, word: CODES[c] ?? "unknown", className: RESULT_CLASS[c] ?? "pending" })) : null,
      dailyWords: record.daily ? describeResults(results) : "",
      bar: recordBar(record, days),
    };
  });

  const lines = bingoLines(squares.map((square) => square.state));
  const count = (state) => squares.filter((square) => square.state === state).length;

  return {
    id: basho.id,
    month: monthName(startDate),
    startDate,
    endDate: toDate(basho.end),
    city: basho.city,
    venue: basho.venue,
    venueUrl: basho.venueUrl,
    sumokaboom: basho.sumokaboom,
    yusho: basho.yusho,
    squares,
    lines,
    totals: { winning: count("kachi-koshi"), losing: count("make-koshi"), out: count("out"), pending: count("pending") },
  };
}

// The basho in a year, in date order: bashoInYear(all, 2025) where `all` is the data in source/_data/basho/
export function bashoInYear(all = {}, year) {
  return Object.values(all)
    .filter((basho) => basho && String(basho.start ?? "").startsWith(String(year)))
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));
}

// ---- For a scraper: the pieces that don't depend on what the Sumo Association's page looks like ----

// How the star chart (hoshitori) writes a day, and the character it becomes
export const SUMO_SYMBOLS = { "○": "w", "●": "l", "□": "w", "■": "f", a: "a", A: "a", R: "r", r: "r" };

// "○●○■" -> "wlwf", padded with "-" to the number of days. Anything unrecognised is returned too.
export function fromSumoSymbols(text = "", days = 15) {
  const unknown = [];
  const mapped = [...String(text).replace(/\s+/g, "")].map((symbol) => {
    if (symbol in SUMO_SYMBOLS) return SUMO_SYMBOLS[symbol];
    if (symbol === "-" || symbol === "－" || symbol === "―") return "-";
    unknown.push(symbol);
    return "-";
  });
  return { results: mapped.join("").padEnd(days, "-").slice(0, days), unknown };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "2026 November Grand Sumo Tournament:Day 2" -> { id: "2026-11", day: 2 }, or undefined if it isn't that
export function parseHeading(text = "") {
  const match = String(text).match(/(\d{4})\s+([A-Za-z]+)\s+Grand Sumo Tournament\s*[:：]?\s*Day\s+(\d+)/i);
  if (!match) return undefined;
  const month = MONTHS.findIndex((name) => name.toLowerCase() === match[2].toLowerCase()) + 1;
  if (!month) return undefined;
  return { id: `${match[1]}-${String(month).padStart(2, "0")}`, day: Number(match[3]) };
}

// Fold a newly fetched day-by-day string into what is already saved. By default a saved result is never changed:
// only days still "-" are filled in, and disagreements are reported. With { force: true } the fetched result wins
// (listed in `overwritten`). A fetched "-" never erases anything, forced or not.
export function mergeResults(saved = "", incoming = "", days = 15, { force = false } = {}) {
  const have = String(saved).padEnd(days, "-");
  const got = String(incoming).padEnd(days, "-");
  const conflicts = [];
  const overwritten = [];
  let changed = false;
  const merged = [...have].map((current, i) => {
    if (got[i] === "-" || got[i] === current) return current;
    if (current === "-") {
      changed = true;
      return got[i];
    }
    if (force) {
      changed = true;
      overwritten.push({ day: i + 1, saved: current, incoming: got[i] });
      return got[i];
    }
    conflicts.push({ day: i + 1, saved: current, incoming: got[i] });
    return current;
  });
  return { results: merged.join(""), changed, conflicts, overwritten };
}

// May a fetched page be written into this basho's file? Only if the page is for the same basho and today is
// during it (or the day after, to catch the last day). Anything else, such as a page for the next basho
// appearing at the same address, is refused so earlier data cannot be overwritten.
export function mayUpdate(basho, heading, now = new Date()) {
  if (!heading) return { ok: false, reason: "the page heading was not recognised" };
  if (heading.id !== basho.id) return { ok: false, reason: `the page is for ${heading.id}, not ${basho.id}` };
  const start = toDate(basho.start).getTime();
  const end = toDate(basho.end).getTime() + 2 * 86_400_000;   // through the day after the final day
  if (now.getTime() < start || now.getTime() >= end) return { ok: false, reason: `${basho.id} is not in progress` };
  return { ok: true };
}

// ---- For the importer: turning what sumo-api.com sends back into the results strings above ----
// https://www.sumo-api.com/api-guide   GET /api/basho/:bashoId/banzuke/Makuuchi
// Each rikishi in "east" and "west" has a "record": one entry per day, in order, e.g. { "result": "win", ... }

// "2025-07" -> "202507" (how the API names a basho)
export const apiBashoId = (id = "") => String(id).replace("-", "");

// What the API calls a day, and the character it becomes. A "fusen win" is a win because the opponent pulled out.
export const API_RESULTS = { win: "w", loss: "l", "fusen win": "w", "fusen loss": "f", absent: "a" };

// How many days of a basho have finished, going by the clock in Japan (day 1 is the start date).
// Makuuchi bouts end by about 18:00 JST, so a day counts as finished from 18:30 that evening.
export function completedDays(basho, now = new Date()) {
  const days = basho.days ?? 15;
  const jst = new Date(toDate(now).getTime() + 9 * 3_600_000);            // shift so the UTC fields read as Japan time
  const today = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
  const [year, month, day] = String(basho.start).slice(0, 10).split("-").map(Number);
  const dayNumber = Math.round((today - Date.UTC(year, month - 1, day)) / 86_400_000) + 1;   // 1 on the opening day
  const afterBouts = jst.getUTCHours() * 60 + jst.getUTCMinutes() >= 18 * 60 + 30;
  const finished = afterBouts ? dayNumber : dayNumber - 1;
  return Math.min(Math.max(finished, 0), days);
}

// One rikishi's "record" -> "wwlf aaa..." Days after `through` stay "-" because nobody has fought them yet:
// the API may well show an unplayed day as "absent", so only the clock can tell the two apart.
export function fromApiRecord(record = [], through = 15, days = 15) {
  const unknown = [];
  const chars = [];
  for (let i = 0; i < days; i++) {
    const entry = record[i];
    if (!entry || i >= through) { chars.push("-"); continue; }
    const code = API_RESULTS[entry.result];
    if (!code) unknown.push({ day: i + 1, result: entry.result });
    chars.push(code ?? "-");
  }
  return { results: chars.join(""), unknown };
}

// Everything in a banzuke response, ready to merge: { id, api, name, rank, results, unknown }[]
export function fromBanzuke(response = {}, through = 15, days = 15) {
  return [...(response.east ?? []), ...(response.west ?? [])].map((r) => ({
    id: rikishiId(r.shikonaEn),
    api: r.rikishiID,
    name: r.shikonaEn,
    rank: r.rank,
    ...fromApiRecord(r.record, through, days),
  }));
}

// Totals-only entries ("record": { wins: 6, losses: 4 }, taken part-way through a basho) can be checked against the
// daily results: the first (wins + losses) fought days should add up to the same totals.
export function checkTotals(saved = {}, results = "") {
  const played = num(saved.wins) + num(saved.losses);
  const first = [...results].slice(0, played);
  // a day lost by default (f) was not one of the totals, so look further along until `played` fought days are found
  const fought = [];
  for (const c of results) { if (c === "w" || c === "l") fought.push(c); if (fought.length === played) break; }
  const wins = fought.filter((c) => c === "w").length;
  const losses = fought.filter((c) => c === "l").length;
  return { ok: fought.length === played && wins === num(saved.wins) && losses === num(saved.losses), wins, losses, first: first.length };
}

// "2026-11" -> the second Sunday of that month, "2026-11-08": when a basho normally starts
export function secondSunday(id = "") {
  const [year, month] = String(id).split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const toSunday = (7 - first.getUTCDay()) % 7;           // days from the 1st to the first Sunday
  return new Date(Date.UTC(year, month - 1, 1 + toSunday + 7)).toISOString().slice(0, 10);
}

// "2026-11-08" + 14 -> "2026-11-22"
export function addDays(date = "", count = 0) {
  const [year, month, day] = String(date).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}
