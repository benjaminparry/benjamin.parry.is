import { createRequire } from "node:module";
import settings from "../source/_data/cycleSettings.js";
import { day, addDays, ownRange, cycleRange, activityEvents, buildCycle, renderCycle, addCycles } from "../_config/cycles.js";
const MarkdownIt = createRequire("/opt/npm-tools/x.js")("markdown-it");
let n = 0, ok = 0;
const check = (name, cond) => { n++; if (cond) ok++; else console.log("FAIL", name); };

const item = (path, date, data = {}) => ({
  inputPath: `./source/${path}`, date: new Date(date), url: `/${path.replace(/\.md$/, "")}/`, fileSlug: path.split("/").pop().replace(/\.md$/, ""),
  data: { title: path.split("/").pop(), ...data },
});

// ---- dates
check("day accepts Date, ISO, compact and time strings", day(new Date("2026-07-11T00:00:00Z")) === "2026-07-11" && day("2026-07-11T14:16:00") === "2026-07-11" && day("20260711") === "2026-07-11" && day("") === undefined && day("nope") === undefined);
check("addDays crosses month and year ends", addDays("2026-07-31", 1) === "2026-08-01" && addDays("2026-12-31", 1) === "2027-01-01");

// ---- ranges
const prev = item("collecting/cycles/2026-06-07-cycles-20260511-20260607.md", "2026-06-07", {});
const cur = item("collecting/cycles/2026-07-11-cycles-20260608-20260711.md", "2026-07-11T14:16:00", {});
check("range from file name", JSON.stringify(ownRange(cur.inputPath, {})) === JSON.stringify({ from: "2026-06-08", to: "2026-07-11", fromSource: "file name" }));
check("front matter overrides file name", ownRange(cur.inputPath, { cycle: { from: "2026-06-01" } }).from === "2026-06-01" && ownRange(cur.inputPath, { cycle: { from: "2026-06-01" } }).fromSource === "front matter");
const r1 = cycleRange(cur, [prev, cur]);
check("file name range, no warnings when it follows the previous cycle", r1.from === "2026-06-08" && r1.to === "2026-07-11" && r1.source === "file name" && !r1.warnings.length);
const bare = { inputPath: "./source/collecting/cycles/2026-08-01-cycles.md", date: new Date("2026-08-01"), data: {} };
const r2 = cycleRange(bare, [prev, cur, bare]);
check("fallback: day after the previous cycle to this post's date", r2.from === "2026-07-12" && r2.to === "2026-08-01" && r2.source === "previous cycle");
const gap = cycleRange({ ...bare, data: { cycle: { from: "2026-07-20" } } }, [prev, cur, bare]);
check("warns about a gap", gap.warnings.length === 1 && gap.warnings[0].includes("2026-07-11"));
let threw = false; try { cycleRange(bare, [bare]); } catch (e) { threw = /cycle: \{ from/.test(e.message); }
check("first ever cycle with no dates explains what to add", threw);
threw = false; try { cycleRange({ ...bare, data: { cycle: { from: "2026-09-01" } } }, [bare]); } catch { threw = true; }
check("start after end is an error", threw);

// ---- activity
const range = { from: "2026-06-08", to: "2026-07-11" };
check("single sitting inside the range", activityEvents([{ date: "2026-06-20" }], range)[0].kind === "done");
check("outside the range is ignored", activityEvents([{ date: "2026-05-20" }, { date: "2026-07-12" }], range).length === 0);
check("range ends are inclusive", activityEvents([{ date: "2026-06-08" }, { date: "2026-07-11" }], range).length === 2);
check("finished series counts on the finished date", activityEvents([{ started: "2026-01-01", finished: "2026-07-01" }], range)[0].kind === "finished");
check("started-only counts as started", activityEvents([{ started: "2026-06-30" }], range)[0].kind === "started");
check("started long ago and finished later is not in the range", activityEvents([{ started: "2026-06-30", finished: "2026-08-01" }], range).length === 0);
check("Date objects from YAML work", activityEvents([{ date: new Date("2026-06-20T00:00:00Z") }], range).length === 1);

// ---- build
const all = [
  prev, cur,
  item("writing/2026-06-10-essay.md", "2026-06-10", { title: "An essay" }),
  item("writing/2026-05-10-old-essay.md", "2026-05-10"),
  item("writing/2026-07-11-same-day.md", "2026-07-11T23:00:00", { title: "Same day" }),
  item("writing/2026-07-12-later.md", "2026-07-12"),
  item("collecting/thoughts/2026-06-20-a-thought.md", "2026-06-20", { title: "A thought" }),
  item("collecting/links/2026-06-25-a-link.md", "2026-06-25", { title: "A link & more" }),
  item("collecting/cycles/2026-06-20-another-cycle.md", "2026-06-20"),
  item("watching/alien.md", "2024-10-30", { title: "Alien: Romulus", rating_emoji: "🍿", watched: [{ date: "2024-10-30" }, { date: "2026-06-30" }] }),
  item("watching/old.md", "2020-01-01", { title: "Old", watched: [{ date: "2020-01-01" }] }),
  item("watching/series.md", "2026-06-01", { title: "A series", watched: [{ started: "2026-06-01", finished: "2026-07-05" }] }),
  item("listening/gig.md", "2026-11-06", { title: "THE WAMEKI", artist: "THE WAMEKI", listened: [{ date: "2026-06-12" }] }),
  item("listening/index.md", "2026-06-12", { title: "Index" }),
  item("playing/game.md", "2026-06-15", { title: "A game" }),
  item("reading/book.md", "2026-06-15", { title: "A book" }),
];
const cycle = buildCycle({ current: cur, all, settings });
const by = Object.fromEntries(cycle.sections.map((s) => [s.key, s.items]));
check("writing in range, both ends inclusive, ordered", by.writing.map((i) => i.title).join("|") === "An essay|Same day");
check("collecting includes subfolders, skips cycles, labels the type", by.collecting.map((i) => `${i.title}:${i.type}`).join("|") === "A thought:thoughts|A link & more:links");
check("watching uses watch dates not post dates; rewatch counted once", by.watching.length === 2 && by.watching.find((i) => i.title === "Alien: Romulus").date === "2026-06-30" && by.watching.find((i) => i.title === "Alien: Romulus").note === "🍿");
check("finished series flagged", by.watching.find((i) => i.title === "A series").kind === "finished");
check("listening uses the listened date and ignores index files", by.listening.length === 1 && by.listening[0].date === "2026-06-12" && by.listening[0].note === "THE WAMEKI");
check("playing without activity entries falls back to the post date", by.playing.length === 1 && by.playing[0].title === "A game");
check("folders not in settings (reading) are ignored", !JSON.stringify(cycle).includes("A book"));
check("the current cycle post is never listed", !JSON.stringify(cycle.sections).includes("cycles-20260608"));

// ---- render
const html = renderCycle(cycle);
check("grouped output has a heading per non-empty section", ["Writing", "Collecting", "Watching", "Listening", "Playing"].every((t) => html.includes(`<h3>${t}</h3>`)));
check("escapes titles", html.includes("A link &amp; more") && !html.includes("A link & more"));
check("collecting items show their type", html.includes('<span class="cycle-links__type">thoughts</span>'));
check("series shows finished label", html.includes('<span class="cycle-links__kind">finished</span>'));
check("no blank lines in the output", !/\n\s*\n/.test(html));
check("only= limits sections", !renderCycle(cycle, { only: "writing" }).includes("Watching") && renderCycle(cycle, { only: ["writing"] }).includes("Writing"));
check("level and headings options", renderCycle(cycle, { level: 4 }).includes("<h4>Writing</h4>") && renderCycle(cycle, { headings: false }).includes("<p><strong>Writing</strong></p>"));
const flat = renderCycle(cycle, { style: "flat" });
check("flat style is one list with types", (flat.match(/<ul>/g) || []).length === 1 && flat.includes('cycle-links__type">writing<'));
check("order desc reverses", renderCycle(cycle, { only: "writing", order: "desc" }).indexOf("Same day") < renderCycle(cycle, { only: "writing", order: "desc" }).indexOf("An essay"));
check("empty cycle renders nothing or the empty text", renderCycle({ sections: [] }) === "" && renderCycle({ sections: [] }, { empty: "Quiet one." }).includes("Quiet one."));
const md = new MarkdownIt({ html: true }).render(`Intro.\n\n## Rollup\n\n${html}\n\nAfter.\n`);
check("Markdown keeps the block intact", !md.includes("<pre") && !md.includes("&lt;ul") && md.includes("<p>After.</p>") && md.includes("<h2>Rollup</h2>"));

// ---- registration through a fake config, using this.ctx like Nunjucks does
const reg = {};
addCycles({ addShortcode: (name, fn) => (reg[name] = fn), addFilter: (name, fn) => (reg[name] = fn) });
const ctx = { page: { inputPath: cur.inputPath, date: cur.date }, ...cur.data, collections: { all }, cycleSettings: settings };
const viaShortcode = reg.cycleLinks.call({ ctx }, { only: "writing", __keywords: true });
check("shortcode reads the page from this.ctx and takes keyword args", viaShortcode.includes("An essay") && !viaShortcode.includes("Watching"));
const viaFilter = reg.cycleContent(all, { inputPath: cur.inputPath, date: cur.date }, settings);
check("filter returns the same data", JSON.stringify(viaFilter.sections) === JSON.stringify(cycle.sections) && viaFilter.range.from === "2026-06-08");
let msg = ""; try { reg.cycleLinks.call({ ctx: { ...ctx, cycleSettings: undefined } }); } catch (e) { msg = e.message; }
check("missing settings gives a clear message", msg.includes("cycleSettings.js"));

console.log(`${ok} of ${n} passed`);
process.exit(ok === n ? 0 : 1);
