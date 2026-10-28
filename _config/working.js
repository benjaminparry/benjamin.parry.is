// Helpers for the /working/ section: who I worked for, what I worked on, and how the two relate.
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// There are three kinds of file, and the relationships between them are all in the front matter:
//
//   organisation   source/working/organisations/clearleft.md
//                  A company I have worked for OR with. It is never labelled "employer" or "client" itself,
//                  because the same organisation can be both (a client who later employs me, an old employer
//                  I freelance for). What it is, is worked out from the files that point at it.
//                    title, website, sector, summary
//
//   engagement     source/working/history/2017-04-03-clearleft.md      (the date in the name is the start)
//                  One stretch of working life: the working history. Who paid me, and how.
//                    type      employed (default when there is an employer), freelance, or contract
//                    employer  an organisation's file name ("clearleft"). Leave it out when freelancing.
//                    role, end (leave out while it is still going), summary
//
//   project        source/working/2024-03-28-opa-winner.md             (the date in the name is the start)
//                  Something I worked on, during one engagement, usually for one client.
//                    engagement  an engagement's file name ("clearleft")
//                    client      an organisation's file name. Leave it out for in-house work with no client.
//                    end (leave out while it is still going), sector, featured, summary, tags
//
// Everything else follows from that. Three examples:
//   Agency:     engagement employed at Clearleft, project client Waitrose  -> "At Clearleft, for Waitrose"
//   In-house:   engagement employed at Waitrose, project with no client    -> "In-house at Waitrose"
//   Freelance:  engagement freelance (no employer), project client Clearleft -> "Freelance, for Clearleft"
// and because an organisation is one file, Clearleft's page shows both the job I had there and the
// freelance project I did for them later.

import { slugify } from "./writing.js";

const MONTH = (date) => date.getUTCFullYear() * 12 + date.getUTCMonth();

export const typeLabels = { employed: "Employed", freelance: "Freelance", contract: "Contract" };

// ---- small helpers -------------------------------------------------------------------------------

// A Date, or a date written as text. Blank, "present", numbers and nonsense are all "no date".
export const toDate = (value) => {
  if (value == null || value === "" || value === false || typeof value === "number") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

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

// Whole months from start to end (end defaults to now). Never negative.
export function monthsBetween(start, end) {
  if (!start || !end) return 0;
  const months = MONTH(end) - MONTH(start) - (end.getUTCDate() < start.getUTCDate() ? 1 : 0);
  return Math.max(0, months);
}

// 0 -> "less than a month", 5 -> "5 months", 12 -> "1 year", 27 -> "2 years 3 months"
export function formatDuration(months) {
  if (!(months >= 1)) return "less than a month";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const part = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  return [years ? part(years, "year") : "", rest ? part(rest, "month") : ""].filter(Boolean).join(" ");
}

const byStartDesc = (a, b) => b.start - a.start || a.title.localeCompare(b.title, "en-GB");

const refOf = (view) => (view ? { slug: view.slug, url: view.url, title: view.title } : null);

// ---- the model -----------------------------------------------------------------------------------

// organisations, engagements and projects are Eleventy collection items:
//   { fileSlug, url, date, data }
// Returns plain, resolved views (no circular references) plus `problems`, a list of things in the
// front matter that point at nothing (a client that has no organisation file, say).
export function buildWork({ organisations = [], engagements = [], projects = [] } = {}, now = new Date()) {
  const problems = [];
  const problem = (message) => problems.push(message);

  // -- organisations
  const orgs = new Map();
  for (const item of organisations) {
    const slug = String(item.fileSlug ?? "");
    if (!slug) continue;
    if (orgs.has(slug)) problem(`Two organisation files are called "${slug}".`);
    orgs.set(slug, {
      slug, url: item.url, item,
      title: item.data?.title || slug,
      website: item.data?.website ?? null,
      summary: item.data?.summary ?? "",
      sector: listOf(item.data?.sector),
    });
  }

  // -- engagements (the working history)
  const jobs = new Map();
  for (const item of engagements) {
    const slug = String(item.fileSlug ?? "");
    const data = item.data ?? {};
    const employerSlug = ["", "self", "freelance"].includes(String(data.employer ?? "").trim().toLowerCase())
      ? null : String(data.employer).trim();
    const employer = employerSlug ? orgs.get(employerSlug) ?? null : null;
    if (employerSlug && !employer) problem(`Engagement "${slug}": there is no organisation file called "${employerSlug}" (employer).`);
    const type = data.type in typeLabels ? data.type : employerSlug ? "employed" : "freelance";
    if (type === "employed" && !employerSlug) problem(`Engagement "${slug}" is employed but has no employer.`);
    const start = toDate(data.start) ?? toDate(item.date);
    const end = toDate(data.end);
    const current = !end || end > now;
    const months = monthsBetween(start, current ? now : end);
    const employerName = employer ? employer.title : employerSlug ? employerSlug : "Freelance";
    const role = String(data.role ?? "").trim();
    if (jobs.has(slug)) problem(`Two engagement files are called "${slug}".`);
    jobs.set(slug, {
      slug, url: item.url, item,
      title: data.title || [role, employer ? `at ${employer.title}` : employerSlug ? `at ${employerSlug}` : "freelance"].filter(Boolean).join(" ") || slug,
      type, typeLabel: typeLabels[type], role, employer, employerName,
      start, end: current ? null : end, current, months, duration: formatDuration(months),
      summary: data.summary ?? "",
    });
  }

  // -- projects
  const projectViews = [];
  for (const item of projects) {
    const data = item.data ?? {};
    const slug = String(item.fileSlug ?? "");
    const job = data.engagement ? jobs.get(String(data.engagement).trim()) ?? null : null;
    if (!data.engagement) problem(`Project "${slug}" has no engagement, so it can't say who I worked for.`);
    else if (!job) problem(`Project "${slug}": there is no engagement file called "${data.engagement}".`);
    const clientSlug = String(data.client ?? "").trim();
    const client = clientSlug ? orgs.get(clientSlug) ?? null : null;
    if (clientSlug && !client) problem(`Project "${slug}": there is no organisation file called "${clientSlug}" (client).`);

    const employer = job?.employer ?? null;
    const sameAsEmployer = client && employer && client.slug === employer.slug;
    const differentClient = client && !sameAsEmployer;
    // How I was working: through an agency (employed, and someone else's project), in-house, freelance or on contract
    let context = "unknown";
    if (job) {
      if (job.type === "employed") context = differentClient ? "agency" : "in-house";
      else context = job.type;
    }
    const how = {
      agency: `At ${job?.employerName}`,
      "in-house": `In-house at ${job?.employerName}`,
      freelance: "Freelance",
      contract: employer ? `Contract at ${job.employerName}` : "Contract",
      unknown: "",
    }[context];
    const relationship = [how, differentClient || (client && !job?.employer) ? `for ${client.title}` : ""].filter(Boolean).join(", ");

    const start = toDate(data.start) ?? toDate(item.date);
    const end = toDate(data.end);
    const current = !end || end > now;
    const months = monthsBetween(start, current ? now : end);
    const ownSectors = listOf(data.sector);
    const sector = ownSectors.length ? ownSectors : client?.sector.length ? client.sector : employer?.sector ?? [];
    projectViews.push({
      slug, url: item.url, item,
      title: data.title || slug, summary: data.summary ?? "",
      start, end: current ? null : end, current, months, duration: formatDuration(months),
      featured: data.featured === true || data.featured === "true",
      sector, context, relationship,
      engagement: job ? { ...refOf(job), employerName: job.employerName, typeLabel: job.typeLabel, role: job.role } : null,
      employer: refOf(employer), client: refOf(client),
    });
  }
  projectViews.sort(byStartDesc);

  const projectsOf = (test) => projectViews.filter(test);

  // -- engagement views: the history, each with its projects
  const engagementViews = [...jobs.values()].map((job) => {
    const list = projectsOf((p) => p.engagement?.slug === job.slug);
    const clients = [];
    for (const p of list) if (p.client && p.client.slug !== job.employer?.slug && !clients.some((c) => c.slug === p.client.slug)) clients.push(p.client);
    return {
      slug: job.slug, url: job.url, title: job.title, type: job.type, typeLabel: job.typeLabel, role: job.role,
      employer: refOf(job.employer), employerName: job.employerName,
      start: job.start, end: job.end, current: job.current, months: job.months, duration: job.duration, summary: job.summary,
      projects: list, clients,
    };
  }).sort(byStartDesc);

  // -- organisation views: the jobs I had there, the projects I did for them, and everything together
  const organisationViews = [...orgs.values()].map((org) => {
    const roles = engagementViews.filter((e) => e.employer?.slug === org.slug);
    const asClient = projectsOf((p) => p.client?.slug === org.slug);
    const all = new Map();
    for (const p of [...roles.flatMap((r) => r.projects), ...asClient]) all.set(p.slug, p);
    const projectList = [...all.values()].sort(byStartDesc);
    return {
      slug: org.slug, url: org.url, title: org.title, website: org.website, summary: org.summary, sector: org.sector,
      roles, asClient, projects: projectList,
      isEmployer: roles.length > 0, isClient: asClient.length > 0,
      current: roles.some((r) => r.current) || projectList.some((p) => p.current),
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
  const sectorViews = [...sectors.values()].sort((a, b) => a.name.localeCompare(b.name, "en-GB"));

  return {
    organisations: organisationViews,
    engagements: engagementViews,
    projects: projectViews,
    sectors: sectorViews,
    current: projectViews.filter((p) => p.current),                   // working on now
    previous: projectViews.filter((p) => !p.current),
    featured: projectViews.filter((p) => p.featured),
    problems,
  };
}

// For templates: find one view by its slug in a list of views
export const bySlug = (list, slug) => (Array.isArray(list) ? list.find((entry) => entry.slug === slug) ?? null : null);
