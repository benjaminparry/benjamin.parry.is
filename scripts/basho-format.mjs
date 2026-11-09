// Writes a basho back out in the same layout the migration script used: one line per rikishi, so the file stays
// easy to read and a git diff shows exactly which rikishi changed.
const q = (value) => JSON.stringify(value);
const inline = (object) =>
  "{ " + Object.entries(object).filter(([, v]) => v !== undefined).map(([k, v]) => `${q(k)}: ${typeof v === "object" ? inline(v) : q(v)}`).join(", ") + " }";

export function format(basho) {
  const top = ["id", "start", "end", "days", "city", "venue", "venueUrl", "sumokaboom", "yusho"]
    .filter((key) => basho[key] !== undefined)
    .map((key) => `  ${q(key)}: ${typeof basho[key] === "object" ? inline(basho[key]) : q(basho[key])}`);
  const card = `  "card": [\n${basho.card.map((id) => `    ${q(id)}`).join(",\n")}\n  ]`;
  const rikishi = `  "rikishi": {\n${Object.entries(basho.rikishi).map(([id, entry]) => `    ${q(id)}: ${inline(entry)}`).join(",\n")}\n  }`;
  return `{\n${[...top, card, rikishi].join(",\n")}\n}\n`;
}
