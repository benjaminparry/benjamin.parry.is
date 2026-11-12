// node scripts/watch-test.mjs   (checks the bingo-line outlook in _config/sumo.js)
import * as s from "../_config/sumo.js";
let n = 0, bad = 0;
const eq = (a, b, m) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.log("FAIL", m, "\n got ", JSON.stringify(a), "\n want", JSON.stringify(b)); } };
const near = (a, b, tol, m) => { n++; if (Math.abs(a - b) > tol) { bad++; console.log("FAIL", m, "got", a, "want", b, "±", tol); } };
const ok = (c, m) => { n++; if (!c) { bad++; console.log("FAIL", m); } };

// ---- the maths ----
near(s.binomialAtLeast(15, 0.5, 8), 0.5, 1e-9, "8+ wins of 15 at even odds is exactly a half");
eq(s.binomialAtLeast(3, 0.5, 0), 1, "needing nothing");
eq(s.binomialAtLeast(3, 0.5, 4), 0, "needing more than are left");
near(s.binomialAtLeast(2, 0.5, 2), 0.25, 1e-9, "two from two");
near(s.winChance({ wins: 0, losses: 0 }), 0.5, 1e-9, "no results: even");
ok(s.winChance({ wins: 7, losses: 0 }) > 0.5 && s.winChance({ wins: 7, losses: 0 }) <= 0.9, "winning streak helps, but is capped");
eq(s.percent(0.004), "under 1%", "under 1%"); eq(s.percent(0.997), "over 99%", "over 99%"); eq(s.percent(0.236), "24%", "rounds");

// ---- a card where I know the answer ----
// 25 rikishi, results made up. Every square starts as 15 undecided days unless set.
const names = Array.from({ length: 25 }, (_, i) => `r${i + 1}`);
const make = (overrides = {}) => {
  const rikishi = {};
  for (const id of names) rikishi[id] = { name: id.toUpperCase(), results: overrides[id] ?? "-".repeat(15) };
  return { id: "2026-11", start: "2026-11-08", end: "2026-11-22", days: 15, card: names, rikishi };
};
const W = "wwwwwwww-------", L = "llllllll-------";            // 8 wins / 8 losses, rest unfought (decided squares)
const midBasho = new Date("2026-11-16T12:00:00Z");

// not started: nothing is decided, every line alive both ways, a line of 5 even squares is 1 in 32
let v = s.bashoView(make(), new Date("2026-11-01T00:00:00Z"));
eq(v.outlook.status, "upcoming", "upcoming");
near(v.outlook.lines[0].winning.chance, 1 / 32, 1e-9, "a fresh line is 1 in 32 each way");
eq(v.outlook.lines.every((l) => l.status === "alive"), true, "all twelve alive at the start");
eq(v.outlook.lines.length, 12, "12 lines: 5 rows, 5 columns, 2 diagonals");

// a bingo: first row all winning
v = s.bashoView(make({ r1: W, r2: W, r3: W, r4: W, r5: W }), midBasho);
eq(v.lines.length, 1, "the existing bingo check still finds it");
eq(v.outlook.bingos, ["Row 1 (winning)"], "outlook agrees");
ok(v.outlook.headline.startsWith("Bingo!"), "headline says bingo");

// an "out" square (forfeit) kills its row and column, both ways, but not the other lines
v = s.bashoView(make({ r7: "wwf------------" }), midBasho);        // r7 is row 2, column 2, and on diagonal 1
const row2 = v.outlook.lines.find((l) => l.label === "Row 2");
eq([row2.winning.status, row2.losing.status, row2.status], ["impossible", "impossible", "impossible"], "out square: row dead both ways");
eq(row2.winning.blockers[0].why, "is out of the tournament", "reason given");
eq(v.outlook.lines.find((l) => l.label === "Column 2").status, "impossible", "and its column");
eq(v.outlook.lines.find((l) => l.label === "Diagonal, top left to bottom right").status, "impossible", "and the diagonal it is on");
eq(v.outlook.lines.find((l) => l.label === "Row 1").status, "alive", "other rows live");
eq(v.outlook.impossible.length, 3, "three lines gone both ways");
ok(v.outlook.impossible.find((i) => i.label === "Row 2").text.includes("R7 is out of the tournament"), "sentence names the rikishi");

// a winning square kills the line as a losing line only
v = s.bashoView(make({ r1: W }), midBasho);
const r1 = v.outlook.lines.find((l) => l.label === "Row 1");
eq([r1.winning.status, r1.losing.status], ["alive", "impossible"], "a winning square closes the losing line");
eq(v.outlook.oneWay.some((o) => o.label === "Row 1" && o.text.includes("can no longer be a losing line")), true, "one-way sentence");
ok(r1.winning.chance > 1 / 32, "and makes the winning line likelier");

// mixed winning and losing squares: dead both ways
v = s.bashoView(make({ r1: W, r2: L }), midBasho);
eq(v.outlook.lines.find((l) => l.label === "Row 1").status, "impossible", "winning plus losing in one line is dead");

// must-win: needs 8 wins and only 8 days left
v = s.bashoView(make({ r1: "lllllll--------" }), midBasho);          // 7 losses, 8 days left: needs all 8 wins
const sq = v.squares[0].outlook;
eq([sq.left, sq.winsToGo], [8, 8], "needs every remaining bout");
ok(v.outlook.alive.some((a) => a.text.includes("must win all 8")), "sentence says must win");

// exact union against a simulation: nobody is decided, so it is the start-of-basho number
const outlook = s.bashoView(make({ r1: "wwwww----------", r2: "lllll----------", r3: "wwl------------" }), midBasho).outlook;
const probs = Array.from({ length: 25 }, (_, i) => {
  const rec = s.recordOf({ results: make({ r1: "wwwww----------", r2: "lllll----------", r3: "wwl------------" }).rikishi[`r${i + 1}`].results });
  return s.squareOutlook(rec, s.stateOf(rec)); });
let seed = 12345; const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
let hits = 0, winHits = 0; const SIMS = 40000;
for (let i = 0; i < SIMS; i++) {
  const state = probs.map((p) => { const r = rand(); return r < p.kachi ? "K" : "M"; });
  let got = false, gotWin = false;
  for (const line of s.BINGO_LINES) { const cells = line.cells.map((c) => state[c]); if (cells.every((c) => c === "K")) { got = gotWin = true; } else if (cells.every((c) => c === "M")) got = true; }
  if (got) hits++; if (gotWin) winHits++;
}
near(outlook.chance.any, hits / SIMS, 0.012, "exact chance of any bingo matches a simulation");
near(outlook.chance.winning, winHits / SIMS, 0.012, "and the winning-only chance");
ok(outlook.chance.any >= Math.max(outlook.chance.winning, outlook.chance.losing) - 1e-9, "any is at least either kind");
ok(outlook.chance.any <= outlook.chance.winning + outlook.chance.losing + 1e-9, "and at most their sum");

// results to watch: more swing first, and only squares in live lines
ok(outlook.watch.length > 0 && outlook.watch.every((w, i, a) => i === 0 || a[i - 1].swing >= w.swing), "watch list sorted by swing");
ok(outlook.watch.every((w) => w.ifWin >= 0 && w.ifWin <= 1 && w.ifLose >= 0 && w.ifLose <= 1), "watch chances are probabilities");

// finished: no prediction, says how it ended
v = s.bashoView(make({ r1: W, r2: W, r3: W, r4: W, r5: "wwwwwwwlllllll-" }), new Date("2026-12-01T00:00:00Z"));
eq(v.outlook.status, "finished", "finished by the clock");
eq(v.outlook.chance, undefined, "no prediction once it's over");
ok(v.outlook.headline.includes("No bingo"), "no bingo said plainly");
ok(v.outlook.paragraphs[0].includes("closest"), "closest line mentioned");
eq(v.outlook.table.length, 12, "table of twelve lines");

console.log(`${n - bad} of ${n} passed`);
process.exit(bad ? 1 : 0);
