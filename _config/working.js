// Helpers for the /working/ section: who I worked for, what I worked on, and how the two relate.
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// The only files that have to exist are projects, in source/working/. A project names who it was for:
//
//   title: Understanding healthcare needs
//   start: 2017-01              when it began (a year, a month or a day: see parseDate)
//   duration: 8 weeks           how long it ran, or `end: 2017-03`, or `end: present`
//   employer: Clearleft         who I was working for. Leave out when freelancing.
//   client: Patient             who the work was for. Same as employer, or left out, for in-house work.
//   sector: [Healthcare]
//
// Names are matched by their slug, so "Clearleft" and "clearleft" are one organisation, and organisations
// appear on their own as soon as a project names them. Two more kinds of file are optional extras:
//
//   source/working/organisations/*.md   a description, website or sector for an organisation
//   source/working/history/*.md         exact dates for a job: employer, role, start, end
//
// Without history files the working history is inferred from the projects (first start to last end for each
// employer), and marked as inferred. A history file for an employer replaces the inferred one.
//
// How I was working follows from the names:
//   employer and a different client  ->  "At Clearleft, for Waitrose"   (agency)
//   employer, no other client        ->  "In-house at Waitrose"
//   no employer, a client            ->  "Freelance, for Clearleft"
// and because an organisation is just a name, Clearleft's page shows the job I had there and a freelance
// project I did for them later.

import { slugify } from "./writing.js";
import { safeUrl } from "./webmentions.js";

const DAY = 24 * 60 * 60 * 1000;
const MONTH = (date) => date.getUTCFullYear() * 12 + date.getUTCMonth();

export const typeLabels = { employed: "Employed", freelance: "Freelance", contract: "Contract" };

// ---- dates ---------------------------------------------------------------------------------------

// A date written as precisely as I know it. Returns { date, precision, iso } or null.
//   2017  or "2017"        -> year   (1 January 2017)
//   "2017-01"              -> month  (1 January 2017, shown as "January 2017")
//   "2017-01-24" or a Date -> day
// Anything else (blank, "present", placeholder text) is null.
export function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : { date: value, precision: "day", iso: value.toISOString().slice(0, 10) };
  }
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 1900 && value <= 2200 ? { date: new Date(Date.UTC(value, 0, 1)), precision: "year", iso: String(value) } : null;
  }
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?:[T ].*)?$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const month = m ? Number(m) : 1;
  const day = d ? Number(d) : 1;
  const date = new Date(Date.UTC(Number(y), month - 1, day));
  if (month < 1 || month > 12 || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;   // 2017-13, 2017-02-31
  const precision = d ? "day" : m ? "month" : "year";
  return { date, precision, iso: `${y}${m ? `-${m}` : ""}${d ? `-${d}` : ""}` };
}

// "2017" / "January 2017" / "3 January 2017"
export function formatDate(date, precision = "day") {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const options = precision === "year" ? { year: "numeric" } : precision === "month" ? { month: "long", year: "numeric" } : { day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(date);
}

// "8 weeks", "2 months", "1 year", "3 days" -> { amount, unit }. Placeholder text is null.
export function parseDuration(value) {
  const match = /^(\d+(?:\.\d+)?)\s*(day|week|month|year)s?$/i.exec(String(value ?? "").trim());
  return match && Number(match[1]) > 0 ? { amount: Number(match[1]), unit: match[2].toLowerCase() } : null;
}

// start + a duration
export function addDuration(start, { amount, unit }) {
  const end = new Date(start.getTime());
  if (unit === "day") return new Date(end.getTime() + Math.round(amount) * DAY);
  if (unit === "week") return new Date(end.getTime() + Math.round(amount * 7) * DAY);
  if (unit === "month") end.setUTCMonth(end.getUTCMonth() + Math.round(amount));
  else end.setUTCFullYear(end.getUTCFullYear() + Math.round(amount));
  return end;
}

// Whole months from start to end. Never negative.
export function monthsBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, MONTH(end) - MONTH(start) - (end.getUTCDate() < start.getUTCDate() ? 1 : 0));
}

// 0 -> "less than a month", 5 -> "5 months", 12 -> "1 year", 27 -> "2 years 3 months"
export function formatDuration(months) {
  if (!(months >= 1)) return "less than a month";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const part = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  return [years ? part(years, "year") : "", rest ? part(rest, "month") : ""].filter(Boolean).join(" ");
}

const isPresent = (value) => ["present", "current", "now", "ongoing"].includes(String(value ?? "").trim().toLowerCase());

// The first moment after a date written to some precision: the end of "2023-08" is 1 September, so
// June to August is three months. A day is taken as the day itself.
const endOf = ({ date, precision }) => {
  const next = new Date(date.getTime());
  if (precision === "year") next.setUTCFullYear(next.getUTCFullYear() + 1);
  else if (precision === "month") next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCDate(next.getUTCDate() + 1);
  return next;
};

// When something started and finished, from its front matter:
//   start (or date)   when it began
//   end               when it finished, or `present` while it is still going
//   duration          "8 weeks": used to work out the end when there is no `end`
//   current: true     the same as end: present
// With no end and no usable duration the end is simply unknown. It is NOT treated as ongoing:
// only `end: present` says that, so unfinished front matter does not make everything look current.
export function periodOf(data = {}, fallback = null, now = new Date()) {
  const start = parseDate(data.start ?? data.date) ?? (fallback ? { date: fallback, precision: "day", iso: fallback.toISOString().slice(0, 10) } : null);
  let current = isPresent(data.end) || data.current === true;
  let end = current ? null : parseDate(data.end);
  const duration = parseDuration(data.duration);
  let estimated = false;
  if (!end && !current && start && duration) {
    const date = addDuration(start.date, duration);
    // No more precise than the start: "June 2023" plus 8 weeks ends in "July 2023", not on a day I never gave
    const precision = start.precision === "day" ? (["day", "week"].includes(duration.unit) ? "day" : "month")
      : start.precision === "year" && duration.unit === "year" ? "year" : "month";
    end = { date, precision, iso: date.toISOString().slice(0, precision === "day" ? 10 : precision === "month" ? 7 : 4) };
    estimated = true;
  }
  const finish = end ? endOf(end) : null;
  if (finish && finish > now && !current) { current = true; end = null; }   // a finish date in the future: still going
  const months = !start ? 0 : current ? monthsBetween(start.date, now) : finish ? monthsBetween(start.date, finish) : 0;
  const startLabel = start ? formatDate(start.date, start.precision) : "";
  const endLabel = end ? formatDate(end.date, end.precision) : "";
  return {
    start: start?.date ?? null, startPrecision: start?.precision ?? null, startIso: start?.iso ?? "", startLabel,
    end: end?.date ?? null, endPrecision: end?.precision ?? null, endIso: end?.iso ?? "", endLabel,
    current, estimated, months,
    // How long: what I wrote ("8 weeks"), or worked out when the end is known
    duration: duration ? String(data.duration).trim() : current || finish ? formatDuration(months) : "",
  };
}

// ---- small helpers -------------------------------------------------------------------------------

// A list or a single string -> a list of trimmed, non-empty strings, each once ("retail" and "Retail" are one)
export function listOf(value) {
  const seen = new Set();
  const out = [];
  for (const item of [].concat(value ?? [])) {
    const name = String(item ?? "").trim();
    const key = slugify(name);
    if (!name || !key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

const nameKey = (name) => slugify(String(name ?? "").trim());   // "" when there is no name
const byStartDesc = (a, b) => (b.start?.getTime() ?? 0) - (a.start?.getTime() ?? 0) || a.title.localeCompare(b.title, "en-GB");
const refOf = (view) => (view ? { slug: view.slug, url: view.url, title: view.title } : null);

// An image path is only usable if it has a file name: "/assets/images/.jpg" is a placeholder
export const usableImage = (path) => (/^\/(?:[^/]+\/)*[^/.][^/]*\.[A-Za-z0-9]+$/.test(String(path ?? "").trim()) ? String(path).trim() : "");

// The URL a project is published at, from its own front matter (never its file name):
//   /working/yyyy/mm/title/      yyyy and mm are the start. `slug:` replaces the title in the URL.
// Returns false for a project marked `hidden: true` (or `draft: true`) so it can be unpublished.
export function projectPermalink(data = {}, fallbackDate = null, fileSlug = "") {
  if (data.hidden === true || data.draft === true) return false;
  const start = parseDate(data.start ?? data.date)?.date ?? fallbackDate;
  const slug = slugify(String(data.slug ?? data.title ?? "")) || slugify(String(fileSlug));
  if (!start || !slug) return false;
  const month = String(start.getUTCMonth() + 1).padStart(2, "0");
  return `/working/${start.getUTCFullYear()}/${month}/${slug}/`;
}

// ---- the model -----------------------------------------------------------------------------------

// organisations, engagements and projects are Eleventy collection items: { fileSlug, url, date, data }.
// Returns plain, resolved views (no circular references) plus `problems`, a list of things in the
// front matter that don't make sense (a project dated outside any job, say).
export function buildWork({ organisations = [], engagements = [], projects = [] } = {}, now = new Date()) {
  const problems = [];
  const problem = (message) => problems.push(message);

  // -- organisations: a name is all it takes. Files only add detail.
  const names = new Map();                                    // key -> { counts: Map(spelling -> n) }
  const seeName = (name) => {
    const key = nameKey(name);
    if (!key) return "";
    if (!names.has(key)) names.set(key, new Map());
    const spellings = names.get(key);
    const spelling = String(name).trim();
    spellings.set(spelling, (spellings.get(spelling) ?? 0) + 1);
    return key;
  };
  const files = new Map();                                    // key -> organisation file data
  for (const item of organisations) {
    const key = seeName(item.data?.title || item.fileSlug);
    if (!key) continue;
    if (files.has(key)) problem(`Two organisation files describe "${item.data?.title || item.fileSlug}".`);
    files.set(key, item.data ?? {});
  }
  const titleOf = (key) => {
    if (files.get(key)?.title) return String(files.get(key).title).trim();
    const spellings = [...(names.get(key) ?? [])].sort((a, b) => b[1] - a[1]);   // most used spelling, then first seen
    return spellings[0]?.[0] ?? key;
  };

  // -- projects: dates, who, where
  // A project with no page (hidden: true) is left out of every list
  const raw = projects.filter((item) => item.url).map((item) => {
    const data = item.data ?? {};
    const period = periodOf(data, item.date, now);
    const employer = seeName(data.employer);
    const client = seeName(data.client);
    if (!parseDate(data.start ?? data.date)) problem(`Project "${data.title ?? item.fileSlug}" has no start (or date) that can be read, so it is dated by its file.`);
    return { item, data, period, employerKey: employer, clientKey: client };
  });

  // -- engagements: from history files, plus one inferred per employer that has none
  const real = [];
  for (const item of engagements) {
    const data = item.data ?? {};
    const employerKey = seeName(data.employer);
    const type = data.type in typeLabels ? data.type : employerKey ? "employed" : "freelance";
    if (type === "employed" && !employerKey) problem(`History file "${item.fileSlug}" is employed but has no employer.`);
    const period = periodOf(data, item.date, now);
    const slug = slugify(String(data.slug ?? item.fileSlug)) || "role";
    real.push({ slug, employerKey, type, role: String(data.role ?? "").trim(), summary: data.summary ?? "", period, inferred: false });
  }
  const slugs = new Set();
  for (const e of real) {
    if (slugs.has(e.slug)) { problem(`Two history files use the slug "${e.slug}".`); let n = 2; while (slugs.has(`${e.slug}-${n}`)) n++; e.slug = `${e.slug}-${n}`; }
    slugs.add(e.slug);
  }
  const covered = new Set(real.map((e) => e.employerKey));
  const inferred = [];
  for (const employerKey of new Set(raw.map((p) => p.employerKey))) {
    if (covered.has(employerKey)) continue;
    const mine = raw.filter((p) => p.employerKey === employerKey && p.period.start);
    if (!mine.length) continue;
    const starts = mine.map((p) => p.period.start.getTime());
    const stops = mine.map((p) => (p.period.current ? Infinity : (p.period.end ?? p.period.start).getTime()));
    const stop = Math.max(...stops);
    const latest = mine.find((p) => (p.period.current ? Infinity : (p.period.end ?? p.period.start).getTime()) === stop);
    const start = new Date(Math.min(...starts));
    const first = mine.find((p) => p.period.start.getTime() === start.getTime());
    const current = stop === Infinity;
    const end = current ? null : latest.period.end ?? latest.period.start;
    const endPrecision = current ? null : latest.period.end ? latest.period.endPrecision : latest.period.startPrecision;
    const finish = end ? endOf({ date: end, precision: endPrecision }) : null;
    const months = current ? monthsBetween(start, now) : monthsBetween(start, finish);
    let slug = employerKey || "freelance";
    while (slugs.has(slug)) slug = `${slug}-2`;
    slugs.add(slug);
    inferred.push({
      slug, employerKey, type: employerKey ? "employed" : "freelance", role: "", summary: "", inferred: true,
      period: {
        start, startPrecision: first.period.startPrecision, startIso: first.period.startIso, startLabel: formatDate(start, first.period.startPrecision),
        end, endPrecision, endIso: current ? "" : (latest.period.end ? latest.period.endIso : latest.period.startIso), endLabel: end ? formatDate(end, endPrecision) : "",
        current, estimated: true, months, duration: formatDuration(months),
      },
    });
  }
  const allEngagements = [...real, ...inferred].map((e) => ({
    ...e,
    // "Designer at Clearleft", or just "Clearleft" with no role; "Designer, freelance", or just "Freelance"
    title: e.employerKey ? (e.role ? `${e.role} at ${titleOf(e.employerKey)}` : titleOf(e.employerKey)) : (e.role ? `${e.role}, freelance` : "Freelance"),
    url: `/working/history/${e.slug}/`,
    typeLabel: typeLabels[e.type],
    employerName: e.employerKey ? titleOf(e.employerKey) : "Freelance",
  }));

  // Which engagement a project belongs to: the one it names, else the same employer's one whose dates
  // include the project's start
  const engagementFor = (p) => {
    if (p.data.engagement) {
      const found = allEngagements.find((e) => e.slug === slugify(String(p.data.engagement)));
      if (found) return found;
      problem(`Project "${p.data.title ?? p.item.fileSlug}": there is no history entry called "${p.data.engagement}".`);
    }
    const sameEmployer = allEngagements.filter((e) => e.employerKey === p.employerKey);
    if (!sameEmployer.length) return null;
    const when = p.period.start?.getTime();
    const contains = sameEmployer.filter((e) => when !== undefined && e.period.start && e.period.start.getTime() <= when
      && (e.period.current || !e.period.end || when < endOf({ date: e.period.end, precision: e.period.endPrecision }).getTime()));
    const pick = (list) => [...list].sort((a, b) => b.period.start - a.period.start)[0];
    if (contains.length) return pick(contains);
    const fallback = sameEmployer.find((e) => e.inferred) ?? pick(sameEmployer);
    if (!fallback.inferred) problem(`Project "${p.data.title ?? p.item.fileSlug}" (${p.period.startLabel}) is outside every history entry for ${fallback.employerName}.`);
    return fallback;
  };

  // -- an organisation's sectors: its file, else the sectors of the projects I did FOR it
  const orgSector = new Map();
  for (const key of names.keys()) {
    const own = listOf(files.get(key)?.sector);
    orgSector.set(key, own.length ? own : listOf(raw.filter((p) => p.clientKey === key).flatMap((p) => listOf(p.data.sector))));
  }

  // -- project views
  const projectViews = [];
  const urls = new Map();
  for (const p of raw) {
    const { data, item, period } = p;
    const job = engagementFor(p);
    const sameAsEmployer = p.clientKey && p.clientKey === p.employerKey;
    const differentClient = p.clientKey && !sameAsEmployer;
    let context = "unknown";
    if (job) context = job.type === "employed" ? (differentClient ? "agency" : "in-house") : job.type;
    else if (p.employerKey) context = differentClient ? "agency" : "in-house";
    else context = "freelance";
    const employerTitle = p.employerKey ? titleOf(p.employerKey) : "";
    const how = { agency: `At ${employerTitle}`, "in-house": `In-house at ${employerTitle}`, freelance: "Freelance", contract: employerTitle ? `Contract at ${employerTitle}` : "Contract", unknown: "" }[context];
    const clientTitle = p.clientKey ? titleOf(p.clientKey) : "";
    const relationship = [how, differentClient ? `for ${clientTitle}` : ""].filter(Boolean).join(", ");
    const own = listOf(data.sector);
    const sector = own.length ? own : p.clientKey && orgSector.get(p.clientKey)?.length ? orgSector.get(p.clientKey) : p.employerKey ? orgSector.get(p.employerKey) ?? [] : [];
    if (urls.has(item.url) && item.url) problem(`Two projects are published at ${item.url}: "${urls.get(item.url)}" and "${data.title ?? item.fileSlug}". Give one a \`slug:\`.`);
    urls.set(item.url, data.title ?? item.fileSlug);
    const orgRef = (key) => (key ? { slug: key, url: `/working/organisations/${key}/`, title: titleOf(key) } : null);
    projectViews.push({
      url: item.url, item,
      title: data.title || item.fileSlug, summary: data.summary ?? "",
      ...period,
      featured: data.featured === true || data.featured === "true",
      sector, context, relationship,
      engagement: job ? { slug: job.slug, url: job.url, title: job.title, employerName: job.employerName, typeLabel: job.typeLabel, role: job.role, inferred: job.inferred } : null,
      employer: orgRef(p.employerKey), client: orgRef(p.clientKey),
      image: usableImage(data.hero?.image), imageAlt: String(data.hero?.imageAlt ?? "").trim(),
      caseStudy: safeUrl(data.caseStudyURL) ? { url: safeUrl(data.caseStudyURL), label: String(data.cta ?? "").trim() || "Read the case study" } : null,
    });
  }
  projectViews.sort(byStartDesc);
  const projectsOf = (test) => projectViews.filter(test);

  // -- engagement views: the history, each with its projects
  const engagementViews = allEngagements.map((e) => {
    const list = projectsOf((p) => p.engagement?.slug === e.slug);
    const clients = [];
    for (const p of list) if (p.client && p.client.slug !== e.employerKey && !clients.some((c) => c.slug === p.client.slug)) clients.push(p.client);
    return {
      slug: e.slug, url: e.url, title: e.title, type: e.type, typeLabel: e.typeLabel, role: e.role, inferred: e.inferred,
      employer: e.employerKey ? { slug: e.employerKey, url: `/working/organisations/${e.employerKey}/`, title: titleOf(e.employerKey) } : null,
      employerName: e.employerName, summary: e.summary, ...e.period, projects: list, clients,
    };
  }).sort(byStartDesc);

  // -- organisation views: the jobs I had there, the projects I did for them, and everything together
  const organisationViews = [...names.keys()].map((key) => {
    const roles = engagementViews.filter((e) => e.employer?.slug === key);
    const asClient = projectsOf((p) => p.client?.slug === key);
    const all = new Map();
    for (const p of [...roles.flatMap((r) => r.projects), ...asClient]) all.set(p.url, p);
    const list = [...all.values()].sort(byStartDesc);
    const file = files.get(key) ?? {};
    return {
      slug: key, url: `/working/organisations/${key}/`, title: titleOf(key),
      website: safeUrl(file.website) || null, summary: file.summary ?? "", sector: orgSector.get(key) ?? [],
      roles, asClient, projects: list, isEmployer: roles.length > 0, isClient: asClient.length > 0,
      current: roles.some((r) => r.current) || list.some((p) => p.current),
    };
  }).sort((a, b) => a.title.localeCompare(b.title, "en-GB"));

  // -- sectors: a sector is a name on an organisation or a project
  const sectors = new Map();
  const sectorOf = (name) => {
    const slug = slugify(name);
    if (!sectors.has(slug)) sectors.set(slug, { slug, name: String(name).trim(), organisations: [], projects: [] });
    return sectors.get(slug);
  };
  for (const org of organisationViews) for (const name of org.sector) sectorOf(name).organisations.push(refOf(org));
  for (const p of projectViews) for (const name of p.sector) sectorOf(name).projects.push(p);

  return {
    organisations: organisationViews,
    engagements: engagementViews,
    projects: projectViews,
    sectors: [...sectors.values()].sort((a, b) => a.name.localeCompare(b.name, "en-GB")),
    current: projectViews.filter((p) => p.current),
    previous: projectViews.filter((p) => !p.current),
    featured: projectViews.filter((p) => p.featured),
    problems,
  };
}

// For templates: find one view by its slug or its url in a list of views
export const bySlug = (list, slug) => (Array.isArray(list) ? list.find((entry) => entry.slug === slug) ?? null : null);
export const byUrl = (list, url) => (Array.isArray(list) ? list.find((entry) => entry.url === url) ?? null : null);
