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
export function bashoView(basho, now = new Date()) {
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
  const outlook = bashoOutlook(basho, squares, now);
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
    outlook,
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

// ---- Watching the bingo lines: which can still happen, how likely they are, and what to watch ----
//
// Every line is five squares in a row. It is a bingo when all five are winning (kachi-koshi) or all five are
// losing (make-koshi). So each line is checked twice, once as a winning line and once as a losing line:
//   complete    all five squares already are what's needed
//   alive       none of the five rules it out, and some are still to be decided
//   impossible  one square already rules it out: for a winning line a square that is losing or out, for a
//               losing line a square that is winning or out. An "out" (injured, absent, retired) square can
//               never be either, so it kills the line both ways.
//
// How likely: each undecided square gets the chance it ends with 8 wins, from the days it has left and how it
// has been doing (see winChance). The squares are treated as independent, so the numbers are a rough guide, not
// odds. The chance of "any bingo" is worked out exactly from those numbers with inclusion and exclusion over
// the lines, so overlapping lines are not counted twice.

export const BINGO_LINES = LINES;

const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
export const lineLabel = (line) => (line.direction === "diagonal" ? `Diagonal, ${line.name}` : `${capital(line.direction)} ${line.number}`);

// P(at least k wins from n bouts when each is won with chance p)
export function binomialAtLeast(n, p, k) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  let total = 0;
  let choose = 1;                                           // n choose 0
  for (let i = 0; i <= n; i++) {
    if (i >= k) total += choose * p ** i * (1 - p) ** (n - i);
    choose = (choose * (n - i)) / (i + 1);
  }
  return Math.min(Math.max(total, 0), 1);
}

// The chance a rikishi wins one of their remaining bouts: their results so far, pulled towards an even chance by
// a prior worth 8 bouts, so one good or bad day doesn't swing it. Kept away from 0 and 1.
export function winChance(record, prior = 4) {
  const played = record.wins + record.losses;
  return Math.min(Math.max((record.wins + prior) / (played + 2 * prior), 0.1), 0.9);
}

// One square: how likely each ending is
//   kachi  chance it ends winning (8 wins)   make  chance it ends losing (8 losses)
export function squareOutlook(record, state, days = 15) {
  if (state === "kachi-koshi") return { kachi: 1, make: 0, left: 0, winsToGo: 0, lossesToGo: 0 };
  if (state === "make-koshi") return { kachi: 0, make: 1, left: 0, winsToGo: 0, lossesToGo: 0 };
  if (state === "out") return { kachi: 0, make: 0, left: 0, winsToGo: 0, lossesToGo: 0 };
  const needed = winsNeeded(days);
  const left = record.pending;
  const winsToGo = Math.max(needed - record.wins, 0);
  const lossesToGo = Math.max(needed - record.losses, 0);
  const p = winChance(record);
  return { kachi: binomialAtLeast(left, p, winsToGo), make: binomialAtLeast(left, 1 - p, lossesToGo), left, winsToGo, lossesToGo, p };
}

const TARGET = { winning: "kachi-koshi", losing: "make-koshi" };
const WHY = {
  winning: { "make-koshi": "is already losing", out: "is out of the tournament" },
  losing: { "kachi-koshi": "is already winning", out: "is out of the tournament" },
};

// One line, one direction
export function lineChecks(line, squares, type) {
  const cells = line.cells.map((index) => squares[index]);
  const target = TARGET[type];
  const blockers = cells.filter((s) => s.state !== target && s.state !== "pending").map((s) => ({ name: s.name, index: s.index, why: WHY[type][s.state] }));
  const have = cells.filter((s) => s.state === target);
  const open = cells.filter((s) => s.state === "pending");
  const status = blockers.length ? "impossible" : open.length ? "alive" : "complete";
  const key = type === "winning" ? "kachi" : "make";
  const chance = status === "impossible" ? 0 : open.reduce((p, s) => p * s.outlook[key], 1);
  return {
    type,
    status,
    chance,
    blockers,
    have: have.map((s) => s.name),
    open: open.map((s) => ({
      name: s.name,
      index: s.index,
      left: s.outlook.left,
      needs: type === "winning" ? s.outlook.winsToGo : s.outlook.lossesToGo,
      chance: s.outlook[key],
    })),
  };
}

// The chance that at least one of the events happens, exactly (given independent squares).
// events: { cells: [square index], type: "winning" | "losing" }; chanceOf(index, type) is that square's chance of
// being what the line needs. Inclusion and exclusion over sets of lines; a set that needs one square to be both
// winning and losing is impossible, so that branch stops there.
export function chanceOfAny(events, chanceOf) {
  let total = 0;
  const need = new Map();
  (function walk(from, count, p) {
    for (let i = from; i < events.length; i++) {
      const event = events[i];
      const added = [];
      let q = p;
      let consistent = true;
      for (const cell of event.cells) {
        const already = need.get(cell);
        if (already === undefined) { need.set(cell, event.type); added.push(cell); q *= chanceOf(cell, event.type); }
        else if (already !== event.type) { consistent = false; break; }
      }
      if (consistent && q > 0) {
        total += count % 2 === 0 ? q : -q;
        walk(i + 1, count + 1, q);
      }
      for (const cell of added) need.delete(cell);
    }
  })(0, 0, 1);
  return Math.min(Math.max(total, 0), 1);
}

// "about 24%", "under 1%", "over 99%"
export function percent(p) {
  if (p <= 0) return "0%";
  if (p < 0.005) return "under 1%";
  if (p >= 1) return "100%";
  if (p > 0.995) return "over 99%";
  return `${Math.round(p * 100)}%`;
}

// "about 24%", but "under 1%" and "over 99%" are already vague, so no "about" in front of them
export const about = (p) => (/^\d/.test(percent(p)) && percent(p) !== "100%" ? `about ${percent(p)}` : percent(p));

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const listOf = (items) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

function needsText(open, type) {
  const word = type === "winning" ? "win" : "loss";
  const parts = open.map((o) => (o.needs >= o.left
    ? `${o.name} must ${type === "winning" ? "win" : "lose"} all ${o.left} remaining bout${o.left === 1 ? "" : "s"}`
    : `${o.name} needs ${plural(o.needs, word).replace("losss", "losses")} from ${plural(o.left, "bout")}`));
  return listOf(parts);
}

// "a, b, c and 2 more"
const upTo = (items, max) => (items.length <= max ? listOf(items) : `${listOf(items.slice(0, max))} and ${items.length - max} more`);
// "Finishing winning takes the chance of a bingo from 31% to 85%; finishing losing takes it to 9%."
function movement(base, winning, losing) {
  const part = (after, word) => (Math.abs(after - base) < 0.01 ? `${word} barely changes it (${percent(after)})` : `${word} takes it ${after > base ? "up" : "down"} to ${percent(after)}`);
  return `The chance of a bingo is ${percent(base)} now. ${capital(part(winning, "finishing winning"))}; ${part(losing, "finishing losing")}.`;
}

// Everything the commentary box shows. `squares` are the views made in bashoView (state, record, name, index).
export function bashoOutlook(basho, squares, now = new Date()) {
  const days = basho.days ?? 15;
  const fought = Math.max(0, ...squares.map((s) => s.record.wins + s.record.losses + s.record.forfeits + s.record.retired));
  const clock = completedDays(basho, now);
  const status = clock >= days ? "finished" : fought === 0 ? "upcoming" : "live";

  for (const square of squares) square.outlook = squareOutlook(square.record, square.state, days);

  const lines = BINGO_LINES.map((line) => {
    const winning = lineChecks(line, squares, "winning");
    const losing = lineChecks(line, squares, "losing");
    const states = [winning.status, losing.status];
    return {
      label: lineLabel(line),
      cells: line.cells,
      names: line.cells.map((i) => squares[i].name),
      winning,
      losing,
      status: states.includes("complete") ? "complete" : states.includes("alive") ? "alive" : "impossible",
    };
  });

  const events = lines.flatMap((l) => [l.winning, l.losing].filter((c) => c.status !== "impossible").map((c) => ({ cells: l.cells, type: c.type, label: l.label })));
  const chanceOf = (index, type) => squares[index].outlook[type === "winning" ? "kachi" : "make"];
  const winningEvents = events.filter((e) => e.type === "winning");
  const losingEvents = events.filter((e) => e.type === "losing");

  const result = { status, played: fought, left: days - fought, days, lines };
  const done = lines.filter((l) => l.status === "complete");
  result.bingos = done.flatMap((l) => [l.winning, l.losing].filter((c) => c.status === "complete").map((c) => `${l.label} (${c.type})`));

  // ---- finished: say how it ended, don't predict ----
  const undecided = squares.filter((s) => s.state === "pending").length;
  if (status === "finished") {
    const best = lines
      .flatMap((l) => [l.winning, l.losing].map((c) => ({ label: l.label, type: c.type, have: c.have.length, blockers: c.blockers })))
      .sort((a, b) => b.have - a.have)[0];
    result.headline = result.bingos.length ? `Bingo! ${listOf(result.bingos)}.` : "No bingo this time.";
    result.paragraphs = [];
    if (!result.bingos.length && best) result.paragraphs.push(`The closest was ${best.label.toLowerCase()} as a ${best.type} line, with ${best.have} of 5 squares${best.blockers.length ? `. ${listOf(best.blockers.map((b) => b.name))} stopped it` : ""}.`);
    if (undecided) result.paragraphs.push(`${plural(undecided, "square")} ${undecided === 1 ? "has" : "have"} no final result in the data yet, so this may not be the final answer.`);
    return finish(result, squares, lines);
  }

  // ---- upcoming and live: predict ----
  const any = chanceOfAny(events, chanceOf);
  result.chance = { any, winning: chanceOfAny(winningEvents, chanceOf), losing: chanceOfAny(losingEvents, chanceOf) };
  const alive = lines.filter((l) => l.status === "alive").flatMap((l) => [l.winning, l.losing].filter((c) => c.status === "alive").map((c) => ({ ...c, label: l.label })));
  alive.sort((a, b) => b.chance - a.chance);
  result.alive = alive.map((c) => ({
    label: c.label,
    type: c.type,
    chance: c.chance,
    chanceText: percent(c.chance),
    text:
      `${c.label}, ${c.type}: ${c.have.length ? `${listOf(c.have)} ${c.have.length === 1 ? "is" : "are"} already ${c.type}. ` : ""}` +
      `${needsText(c.open, c.type)}. Chance: ${about(c.chance)}.`,
  }));

  const likely = result.alive.filter((a) => a.chance >= 0.01).slice(0, 5);
  const rest = result.alive.length - likely.length;
  result.aliveShown = [...likely.map((a) => a.text), ...(rest ? [`${plural(rest, "other line")} ${rest === 1 ? "is" : "are"} still possible but ${rest === 1 ? "has" : "have"} under a 1% chance each. See the table below.`] : [])];

  const dead = lines.filter((l) => l.status === "impossible");
  result.impossible = dead.map((l) => {
    const names = [...new Set([...l.winning.blockers, ...l.losing.blockers].map((b) => b.name))];
    const reasons = [...new Map([...l.winning.blockers, ...l.losing.blockers].map((b) => [b.name, `${b.name} ${b.why}`])).values()];
    return { label: l.label, text: `${l.label} can no longer be a bingo: ${listOf(reasons)}.`, names };
  });
  result.oneWay = lines
    .filter((l) => (l.winning.status === "impossible") !== (l.losing.status === "impossible") && l.status !== "complete")
    .map((l) => {
      const closed = l.winning.status === "impossible" ? l.winning : l.losing;
      const open = closed === l.winning ? l.losing : l.winning;
      return { label: l.label, text: `${l.label} can no longer be a ${closed.type} line (${listOf(closed.blockers.map((b) => `${b.name} ${b.why}`))}) but is still possible as a ${open.type} one.` };
    });

  // ---- results to watch: the squares whose ending moves the chance of any bingo the most ----
  const base = any;
  const live = new Set(alive.flatMap((c) => c.open.map((o) => o.index)));
  result.watch = [...live]
    .map((index) => {
      const square = squares[index];
      const pinned = (win) => (cell, type) => (cell === index ? ((type === "winning") === win ? 1 : 0) : chanceOf(cell, type));
      const ifWin = chanceOfAny(events, pinned(true));
      const ifLose = chanceOfAny(events, pinned(false));
      const types = new Map();
      for (const c of alive.filter((c) => c.open.some((o) => o.index === index))) types.set(c.label.toLowerCase(), [...(types.get(c.label.toLowerCase()) ?? []), c.type]);
      const through = [...types].map(([label, kinds]) => `${label} (${kinds.join(" or ")})`);
      return { index, name: square.name, ifWin, ifLose, swing: Math.abs(ifWin - ifLose), through, left: square.outlook.left, winsToGo: square.outlook.winsToGo };
    })
    .filter((w) => w.swing >= 0.01)
    .sort((a, b) => b.swing - a.swing)
    .slice(0, 4)
    .map((w) => ({
      ...w,
      text:
        `${w.name} (${w.winsToGo >= w.left ? `must win all ${w.left}` : `needs ${plural(w.winsToGo, "more win")} from ${plural(w.left, "bout")}`}; in ${upTo(w.through, 3)}). ` +
        movement(base, w.ifWin, w.ifLose),
    }));

  const winningLeft = lines.filter((l) => l.winning.status !== "impossible").length;
  const losingLeft = lines.filter((l) => l.losing.status !== "impossible").length;
  result.headline = result.bingos.length
    ? `Bingo! ${listOf(result.bingos)}.`
    : status === "upcoming"
      ? `Not started. The chance of a bingo over the tournament is ${about(any)}.`
      : `${plural(result.left, "day")} to go. The chance of a bingo by day ${days} is ${about(any)} (a winning line ${percent(result.chance.winning)}, a losing line ${percent(result.chance.losing)}).`;
  result.paragraphs = [
    `${plural(lines.length - dead.length, "line")} of ${lines.length} can still be a bingo: ${winningLeft} as a winning line and ${losingLeft} as a losing line. ${dead.length ? `${plural(dead.length, "line")} ${dead.length === 1 ? "is" : "are"} out of the running both ways.` : "None is out of the running yet."}`,
  ];
  return finish(result, squares, lines);
}

// Mark the squares worth watching, and give the table of all twelve lines
function finish(result, squares, lines) {
  const watch = new Set((result.watch ?? []).map((w) => w.index));
  for (const square of squares) square.watch = watch.has(square.index);
  const cell = (c) =>
    c.status === "complete" ? "Bingo" :
    c.status === "impossible" ? `Impossible: ${listOf([...new Set(c.blockers.map((b) => `${b.name} ${b.why}`))])}` :
    `Possible, ${about(c.chance)}`;
  result.table = lines.map((l) => ({ label: l.label, names: l.names.join(", "), winning: cell(l.winning), losing: cell(l.losing), status: l.status }));
  return result;
}
