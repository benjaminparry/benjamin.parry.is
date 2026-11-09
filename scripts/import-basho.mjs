// Builds and updates a basho's data file from sumo-api.com (https://www.sumo-api.com/api-guide).
// All you have to give it is the basho and the 25 rikishi on your card; the API does the rest.
//
//   Start a new basho (no file yet): name the card, left to right, top to bottom
//     node scripts/import-basho.mjs 2026-11 --card tokihayate,kotoshoho,... (25 names)
//   Or create source/_data/basho/2026-11.json yourself with just  { "id": "2026-11", "card": [ ... ] }
//
//   Then, any time (after each day's bouts during a basho):
//     node scripts/import-basho.mjs 2026-11                 shows what would change, writes nothing
//     node scripts/import-basho.mjs 2026-11 --write         saves it into source/_data/basho/2026-11.json
//
// What it fills in
//   start, end, days   from the API (or, before the API knows the basho, the usual second Sunday: it says so)
//   city, venue, venueUrl   copied from your most recent basho held in the same month (they don't change much)
//   rikishi            a name, the API's id and the day-by-day results for everyone on your card
//   yusho              the winner of the makuuchi division, if that rikishi is on your card
//
// Options
//   --card a,b,c       the 25 rikishi, only used when there is no data file yet
//   --force            the API wins: replace values already in your file when they differ (never with "-")
//   --through 10       only trust the first 10 days (default: worked out from the clock in Japan)
//   --refresh          ignore the saved copy in .cache/sumo-api and ask the API again
//   --file x.json, --basho-file y.json   use saved responses instead of asking online (for testing)
//
// What it will and won't do
//   - It only touches rikishi who are on the card. Everyone else in the division is ignored.
//   - Anything already in your file is kept unless you add --force. Differences are listed.
//   - Days that haven't been fought yet stay "-" (the API can show them as "absent").
//   - It asks for two pages and keeps a copy for an hour, so running it again is free. Please keep it that way:
//     the API is free and run by volunteers.
//   - It is not part of the Eleventy build. Run it yourself, then look at the diff before you commit.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rikishiId, apiBashoId, completedDays, fromBanzuke, mergeResults, checkTotals, problemsWith, secondSunday, addDays } from "../_config/sumo.js";
import { format } from "./basho-format.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const id = args.find((a) => /^\d{4}-\d{2}$/.test(a));
if (!id) { console.error("Say which basho, e.g.  node scripts/import-basho.mjs 2026-11"); process.exit(1); }

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "source/_data/basho");
const dataFile = join(dataDir, `${id}.json`);
const notes = [];

// ---- the file: yours if it exists, otherwise a new one from --card ----
let basho;
if (existsSync(dataFile)) {
  basho = JSON.parse(readFileSync(dataFile, "utf8"));
  if (option("card")) notes.push("--card was ignored because the file already exists");
} else if (option("card")) {
  basho = { id, card: option("card").split(",").map((name) => rikishiId(name.trim())).filter(Boolean) };
  console.log(`Starting ${dataFile}`);
} else {
  console.error(`There is no ${dataFile}.\nName your 25 rikishi, left to right and top to bottom:\n  node scripts/import-basho.mjs ${id} --card tokihayate,kotoshoho,...\nor create that file with just { "id": "${id}", "card": [ ... ] }.`);
  process.exit(1);
}
basho.id ??= id;
if (basho.id !== id) { console.error(`${dataFile} says its id is "${basho.id}". Nothing was changed.`); process.exit(1); }
basho.days ??= 15;
basho.card = (basho.card ?? []).map((name) => rikishiId(name));
basho.rikishi ??= {};
const days = basho.days;

// ---- get the responses (the banzuke for the days, the basho itself for the dates and winner) ----
const base = `https://www.sumo-api.com/api/basho/${apiBashoId(id)}`;
async function getJson(url, name, { optional = false } = {}) {
  if (option("file") && name === "banzuke") return JSON.parse(readFileSync(option("file"), "utf8"));
  if (option("basho-file") && name === "basho") return JSON.parse(readFileSync(option("basho-file"), "utf8"));
  if (option("file") || option("basho-file")) return undefined;      // testing from files: don't go online for the other one
  const cache = join(root, ".cache/sumo-api", `${apiBashoId(id)}-${name}.json`);
  if (!flag("refresh") && existsSync(cache) && Date.now() - statSync(cache).mtimeMs < 3_600_000) {
    console.log(`Using the copy saved in the last hour (${cache})`);
    return JSON.parse(readFileSync(cache, "utf8"));
  }
  console.log(`Asking ${url}`);
  const reply = await fetch(url, { headers: { "User-Agent": "benjamin.parry.is-sumo-bingo", Accept: "application/json" } });
  if (!reply.ok) {
    if (optional) { notes.push(`the API answered ${reply.status} for ${url}`); return undefined; }
    throw new Error(`the API answered ${reply.status} ${reply.statusText} for ${url}`);
  }
  const text = await reply.text();
  mkdirSync(dirname(cache), { recursive: true });
  writeFileSync(cache, text);
  return JSON.parse(text);
}

const response = await getJson(`${base}/banzuke/Makuuchi`, "banzuke");
if (!response) { console.error("--file needs the banzuke response"); process.exit(1); }
if (String(response.bashoId) !== apiBashoId(id)) { console.error(`The response is for basho ${response.bashoId}, not ${apiBashoId(id)}. Nothing was changed.`); process.exit(1); }
if (response.division !== "Makuuchi") { console.error(`The response is for ${response.division}, not Makuuchi. Nothing was changed.`); process.exit(1); }
let details = await getJson(base, "basho", { optional: true });
if (details && String(details.date) !== apiBashoId(id)) { notes.push(`the basho details are for ${details.date}, not ${apiBashoId(id)}: ignored`); details = undefined; }

// ---- dates ----
const theirs = { start: String(details?.startDate ?? "").slice(0, 10), end: String(details?.endDate ?? "").slice(0, 10) };
if (!theirs.start) {
  theirs.start = secondSunday(id);
  theirs.end = addDays(theirs.start, days - 1);
  if (!basho.start) notes.push(`the API has no dates for ${id} yet, so start (${theirs.start}) and end (${theirs.end}) are the usual second Sunday. Run it again later to confirm them with --force.`);
  else theirs.start = theirs.end = "";        // we only guessed, so don't argue with dates that are already saved
}
for (const field of ["start", "end"]) {
  if (!theirs[field]) continue;
  if (!basho[field]) basho[field] = theirs[field];
  else if (basho[field] !== theirs[field]) {
    if (flag("force")) { notes.push(`${field} changed from ${basho[field]} to ${theirs[field]} (--force)`); basho[field] = theirs[field]; }
    else notes.push(`${field} is ${basho[field]} in your file but ${theirs[field]} in the API. Add --force to correct it.`);
  }
}

// ---- where it is held: copied from the most recent basho in the same month ----
const month = id.slice(5);
const earlier = existsSync(dataDir)
  ? readdirSync(dataDir).filter((f) => f.endsWith(`-${month}.json`) && f !== `${id}.json`).sort().reverse()
  : [];
for (const file of earlier) {
  const other = JSON.parse(readFileSync(join(dataDir, file), "utf8"));
  const missing = ["city", "venue", "venueUrl"].filter((key) => !basho[key] && other[key]);
  if (!missing.length) continue;
  for (const key of missing) basho[key] = other[key];
  notes.push(`${missing.join(", ")} copied from ${file}. Check them if the venue has changed.`);
  break;
}
if (!basho.city) notes.push("city is not set (it's optional)");

const through = option("through") !== undefined ? Number(option("through")) : completedDays(basho);
console.log(`${id}: treating ${through} of ${days} days as fought${option("through") !== undefined ? " (from --through)" : " (from the clock in Japan)"}`);

// ---- the rikishi on the card ----
const fetched = fromBanzuke(response, through, days);
const byApi = new Map(fetched.map((r) => [r.api, r]));
const bySlug = new Map(fetched.map((r) => [r.id, r]));
let filled = 0, unchanged = 0;

for (const key of basho.card) {
  const existing = basho.rikishi[key];
  const entry = existing ?? {};
  const found = byApi.get(entry.api) ?? bySlug.get(key);
  if (!found) {
    notes.push(`${key}: not found in the API response (spelt differently there? set "api" to its rikishiID)`);
    if (!existing) basho.rikishi[key] = { name: key.charAt(0).toUpperCase() + key.slice(1), results: "-".repeat(days) };
    continue;
  }

  for (const u of found.unknown) notes.push(`${key}: day ${u.day} has a result I don't know ("${u.result}"), left as "-"`);

  const { results, changed, conflicts, overwritten } = mergeResults(entry.results, found.results, days, { force: flag("force") });
  for (const c of conflicts) notes.push(`${key}: day ${c.day} is "${c.saved}" in your file but the API says "${c.incoming}". Left as it is.`);
  for (const o of overwritten) notes.push(`${key}: day ${o.day} changed from "${o.saved}" to "${o.incoming}" (--force)`);

  const hadTotals = entry.record && !/[wlfar]/.test(entry.results ?? "");
  if (hadTotals) {
    const check = checkTotals(entry.record, results);
    notes.push(check.ok
      ? `${key}: the old totals (${entry.record.wins}-${entry.record.losses}) match the daily results`
      : `${key}: the old totals say ${entry.record.wins}-${entry.record.losses} but the daily results give ${check.wins}-${check.losses} for the same number of fought days. Check it.`);
  }

  if (existing && !changed && entry.api === found.api) { unchanged++; continue; }
  filled += changed || !existing ? 1 : 0;
  const { name, results: _old, record, api: _api, ...rest } = entry;
  basho.rikishi[key] = { name: name ?? found.name, api: found.api, results, ...rest, ...(hadTotals && changed ? {} : record ? { record } : {}) };
  if (changed || !existing) console.log(`  ${key.padEnd(14)} ${entry.results ?? ""}  ->  ${results}`);
}

// ---- the winner ----
const winner = (details?.yusho ?? []).find((y) => y.type === "Makuuchi");
if (winner) {
  const key = basho.card.find((k) => basho.rikishi[k]?.api === winner.rikishiId) ?? basho.card.find((k) => k === rikishiId(winner.shikonaEn));
  if (!key) notes.push(`the yusho went to ${winner.shikonaEn}, who is not on your card, so "yusho" was not set`);
  else if (basho.yusho && basho.yusho !== key && !flag("force")) notes.push(`yusho is "${basho.yusho}" in your file but the API says ${key}. Add --force to change it.`);
  else if (basho.yusho !== key) { basho.yusho = key; notes.push(`yusho set to ${key}`); }
}

for (const problem of problemsWith(basho)) notes.push(`problem: ${problem}`);

console.log(`\n${filled} rikishi added or updated, ${unchanged} already up to date.`);
if (notes.length) console.log("\nWorth a look:\n" + notes.map((n) => `  - ${n}`).join("\n"));

if (!flag("write")) { console.log("\nNothing written. Add --write to save these changes."); process.exit(0); }
mkdirSync(dataDir, { recursive: true });
writeFileSync(dataFile, format(basho));
console.log(`\nSaved ${dataFile}`);
