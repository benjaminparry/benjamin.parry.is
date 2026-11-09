// node scripts/api-test.mjs path/to/saved-banzuke-202507.json   (checks the API mapping against a saved response)
import fs from "node:fs";
import * as s from "../_config/sumo.js";
let bad = 0, n = 0;
const eq = (a, b, m) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.log("FAIL", m, "\n got ", JSON.stringify(a), "\n want", JSON.stringify(b)); } };
const api = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
eq(s.apiBashoId("2025-07"), "202507", "id");
const all = s.fromBanzuke(api);
eq(all.length, 42, "42 rikishi");
eq(all.every((r) => r.results.length === 15 && r.unknown.length === 0), true, "all 15 long, nothing unknown");
// the API's own totals must equal the daily results, for every rikishi
const rows = [...api.east, ...api.west];
for (const [i, r] of all.entries()) {
  const rec = s.recordOf({ results: r.results });
  const f = r.results.split("f").length - 1;   // the API counts a forfeit as a loss and the days after it as "absences"; the card keeps them apart as "out"
  eq([rec.wins, rec.losses, rec.forfeits], [rows[i].wins, rows[i].losses - f, rows[i].absences + f], `${r.name} totals`);
}
eq(s.fromApiRecord([{ result: "win" }, { result: "absent" }, { result: "loss" }], 2, 4), { results: "wa--", unknown: [] }, "through guard");
eq(s.fromApiRecord([{ result: "huh" }], 1, 2), { results: "--", unknown: [{ day: 1, result: "huh" }] }, "unknown result reported");
eq(s.fromApiRecord([{ result: "fusen win" }, { result: "fusen loss" }], 2, 2).results, "wf", "fusen");
eq(s.checkTotals({ wins: 2, losses: 1 }, "wfl w".replace(" ", "")).ok, true, "forfeit day skipped when checking totals");
eq(s.checkTotals({ wins: 3, losses: 0 }, "wwl").ok, false, "mismatch spotted");
eq(s.mergeResults("wl-", "ll-", 3, { force: true }), { results: "ll-", changed: true, conflicts: [], overwritten: [{ day: 1, saved: "w", incoming: "l" }] }, "force overwrites");
eq(s.mergeResults("wlw", "---", 3, { force: true }).results, "wlw", "force never erases with -");
eq(s.mergeResults("wlw", "wlw", 3, { force: true }).changed, false, "force with no difference changes nothing");
eq(s.mergeResults("wlw", "llw", 3).results, "wlw", "no force: kept");
eq([s.secondSunday("2026-11"), s.secondSunday("2026-09"), s.secondSunday("2025-07")], ["2026-11-08", "2026-09-13", "2025-07-13"], "second Sundays");
eq(s.addDays("2026-11-08", 14), "2026-11-22", "addDays");
console.log(`${n - bad} of ${n} passed`);
process.exit(bad ? 1 : 0);
