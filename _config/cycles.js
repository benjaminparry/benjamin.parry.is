// Cycle posts: find everything published (or watched, played, listened to) between two dates.
// Plain JavaScript with no Eleventy code in it apart from addCycles() at the bottom, so it is easy to test.
// Settings (which folders, which front matter keys) live in source/_data/cycleSettings.js. See docs/cycles.md.

// ---- Dates ---------------------------------------------------------------------------------------------------
// Everything is compared as a calendar day written "YYYY-MM-DD", so there are no time zone surprises.
export function day(value) {
  if (value == null || value === "") return undefined;
  if (value instanceof Date) return Number.isNaN(+value) ? undefined : value.toISOString().slice(0, 10);
  const m = String(value).trim().match(/^(\d{4})-?(\d{2})-?(\d{2})/); // 2026-07-11, 20260711, 2026-07-11T14:16:00
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
}
export const addDays = (d, n) => day(new Date(Date.parse(d) + n * 86_400_000));
const within = (d, range) => Boolean(d) && d >= range.from && d <= range.to;

// ---- Working out a cycle's dates -----------------------------------------------------------------------------
// Order of trust: front matter `cycle: { from, to }`, then the file name (...-cycles-20260608-20260711.md),
// then "the day after the previous cycle ended" up to this post's own date.
export function ownRange(inputPath, data = {}) {
  const m = String(inputPath).split("/").pop().match(/(\d{8})-(\d{8})/);
  const fm = data.cycle ?? {};
  const from = day(fm.from);
  const to = day(fm.to);
  return {
    from: from ?? (m ? day(m[1]) : undefined),
    to: to ?? (m ? day(m[2]) : undefined),
    fromSource: from ? "front matter" : m ? "file name" : undefined,
  };
}

const endOf = (post) => ownRange(post.inputPath, post.data).to ?? day(post.date);

export function cycleRange(current, cyclePosts) {
  const own = ownRange(current.inputPath, current.data);
  const to = own.to ?? day(current.date);
  const previousEnds = cyclePosts
    .filter((p) => p.inputPath !== current.inputPath)
    .map(endOf)
    .filter((e) => e && e < to)
    .sort();
  const previousEnd = previousEnds.at(-1);

  let from = own.from;
  let source = own.fromSource;
  if (!from) {
    if (!previousEnd) throw new Error(`cycles: can't work out where ${current.inputPath} starts. Add  cycle: { from: YYYY-MM-DD }  to its front matter.`);
    from = addDays(previousEnd, 1);
    source = "previous cycle";
  }
  if (from > to) throw new Error(`cycles: ${current.inputPath} starts (${from}) after it ends (${to}).`);

  const warnings = [];
  if (previousEnd && source !== "previous cycle" && addDays(previousEnd, 1) !== from) {
    warnings.push(`starts ${from} but the previous cycle ended ${previousEnd}`);
  }
  return { from, to, source, warnings };
}

// ---- Finding the content -------------------------------------------------------------------------------------
// Items with a list of dated entries (watched:, listened:, played: ...) count by those dates, not the post date.
//   - date: 2026-01-02                          done in one sitting
//   - started: 2026-09-01                       started, not finished yet
//   - started: 2025-02-01, finished: 2025-03-10 finished
export function activityEvents(entries, range) {
  const events = [];
  for (const e of Array.isArray(entries) ? entries : []) {
    const done = day(e.finished ?? e.date);
    if (done) {
      if (within(done, range)) events.push({ date: done, kind: e.finished ? "finished" : "done" });
    } else if (within(day(e.started), range)) {
      events.push({ date: day(e.started), kind: "started" });
    }
  }
  return events;
}

const cleanPath = (p) => String(p).replace(/^\.\//, "");

export function sectionItems(section, all, range, inputDir = "source") {
  const prefix = `${inputDir}/${section.folder}/`;
  const skip = (section.skip ?? []).map((s) => `${prefix}${s}/`);
  const out = [];

  for (const item of all) {
    const path = cleanPath(item.inputPath);
    if (!path.startsWith(prefix) || skip.some((s) => path.startsWith(s))) continue;
    if (/^index\./.test(path.split("/").pop())) continue;

    const rest = path.slice(prefix.length).split("/");
    const type = rest.length > 1 ? rest[0] : undefined; // e.g. "thoughts" for collecting/thoughts/x.md
    const data = item.data ?? {};

    let date, kind, count = 1;
    if (section.activityKey && Array.isArray(data[section.activityKey])) {
      const events = activityEvents(data[section.activityKey], range);
      if (!events.length) continue;
      const latest = events.sort((a, b) => a.date.localeCompare(b.date)).at(-1);
      ({ date, kind } = latest);
      count = events.length;
    } else {
      date = day(item.date);
      if (!within(date, range)) continue;
    }

    out.push({
      section: section.key,
      title: data.title ?? item.fileSlug ?? item.url,
      url: item.url,
      date,
      kind,
      count,
      type,
      note: section.note ? section.note(data) || undefined : undefined,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export function buildCycle({ current, all, settings }) {
  const inputDir = settings.inputDir ?? "source";
  const cyclePrefix = `${inputDir}/${settings.cyclesFolder ?? "collecting/cycles"}/`;
  const cyclePosts = all.filter((i) => cleanPath(i.inputPath).startsWith(cyclePrefix));
  const range = cycleRange(current, cyclePosts);

  const others = all.filter((i) => i.inputPath !== current.inputPath);
  const sections = settings.sections.map((section) => ({
    key: section.key,
    title: section.title,
    items: sectionItems(section, others, range, inputDir),
  }));
  return { range, sections };
}

// ---- Output --------------------------------------------------------------------------------------------------
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

const KIND_LABEL = { started: "started", finished: "finished" };

function itemHtml(item, { showType }) {
  const bits = [`<a href="${esc(item.url)}">${esc(item.title)}</a>`];
  if (item.kind && KIND_LABEL[item.kind]) bits.push(`<span class="cycle-links__kind">${KIND_LABEL[item.kind]}</span>`);
  if (showType && item.type) bits.push(`<span class="cycle-links__type">${esc(item.type)}</span>`);
  if (item.note) bits.push(`<span class="cycle-links__note">${esc(item.note)}</span>`);
  return `<li>${bits.join(" ")}</li>`;
}

// options: only ("writing,watching" or an array), style ("grouped" | "flat"), headings (true | false), level (3),
//          order ("asc" | "desc"), empty (text to show when nothing is found), class
export function renderCycle(cycle, options = {}) {
  const only = typeof options.only === "string" ? options.only.split(",").map((s) => s.trim()) : options.only;
  const style = options.style ?? "grouped";
  const headings = options.headings !== false && options.headings !== "false";
  const level = Math.min(6, Math.max(1, Number(options.level) || 3));
  const desc = options.order === "desc";

  const sections = cycle.sections
    .filter((s) => !only || only.includes(s.key))
    .map((s) => ({ ...s, items: desc ? [...s.items].reverse() : s.items }))
    .filter((s) => s.items.length);

  const cls = `cycle-links${options.class ? ` ${esc(options.class)}` : ""}`;
  if (!sections.length) return options.empty ? `<p class="${cls}">${esc(options.empty)}</p>` : "";

  const lines = [`<div class="${cls}">`];
  if (style === "flat") {
    lines.push("<ul>");
    for (const s of sections) for (const item of s.items) {
      lines.push(itemHtml({ ...item, type: item.type ?? s.title.toLowerCase() }, { showType: true }));
    }
    lines.push("</ul>");
  } else {
    for (const s of sections) {
      lines.push(headings ? `<h${level}>${esc(s.title)}</h${level}>` : `<p><strong>${esc(s.title)}</strong></p>`);
      lines.push("<ul>", ...s.items.map((item) => itemHtml(item, { showType: s.key === "collecting" })), "</ul>");
    }
  }
  lines.push("</div>");
  return lines.join("\n");
}

// ---- Eleventy ------------------------------------------------------------------------------------------------
// Nunjucks passes keyword arguments as one object: {% cycleLinks only="writing", style="flat" %}
function readOptions(args) {
  const o = {};
  for (const a of args) if (a && typeof a === "object") { const { __keywords, ...rest } = a; Object.assign(o, rest); }
  return o;
}

export function addCycles(eleventyConfig) {
  const settingsFrom = (ctx) => {
    if (!ctx?.cycleSettings) throw new Error("cycles: source/_data/cycleSettings.js is missing.");
    return ctx.cycleSettings;
  };

  // Ready-made list:   {% cycleLinks %}   or   {% cycleLinks only="writing,watching", style="flat" %}
  // It reads the current page from the template context, so it needs no arguments. Must be a normal function (not an arrow).
  eleventyConfig.addShortcode("cycleLinks", function (...args) {
    const ctx = this.ctx;
    const current = { inputPath: ctx.page.inputPath, date: ctx.page.date, data: ctx };
    const cycle = buildCycle({ current, all: ctx.collections.all, settings: settingsFrom(ctx) });
    for (const w of cycle.range.warnings) console.warn(`[cycles] ${ctx.page.inputPath}: ${w}`);
    return renderCycle(cycle, readOptions(args));
  });

  // Raw data for your own template:   {% set cycle = collections.all | cycleContent(page, cycleSettings) %}
  eleventyConfig.addFilter("cycleContent", function (all, page, settings) {
    const self = all.find((i) => i.inputPath === page.inputPath);
    const current = { inputPath: page.inputPath, date: page.date, data: self?.data ?? {} };
    return buildCycle({ current, all, settings });
  });
}
