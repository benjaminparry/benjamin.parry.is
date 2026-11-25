// Reviews how your posts are tagged and writes a report of ways to link them up.
//
//   node scripts/tag-review.mjs                      write tag-review.md
//   node scripts/tag-review.mjs --min low            include weaker suggestions (default: medium)
//   node scripts/tag-review.mjs --max 3              at most 3 suggestions per post (default: 5)
//   node scripts/tag-review.mjs --section writing    one section only
//   node scripts/tag-review.mjs --post writing/2025-11-06-trails-of-experience.md    one post, printed here
//   node scripts/tag-review.mjs --json tags.json     also save the suggestions as data
//
// Nothing in your posts is changed. See docs/tags.md.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadIndex } from "../_config/tags-files.js";
import { slugify } from "../_config/writing.js";
import { suggest, suggestFor, explain, evaluate, likelyDuplicates, canonicalTags, reach, missingTopics } from "../_config/tags.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORDER = { high: 3, medium: 2, low: 1 };

export function parseArgs(argv) {
  const opts = { min: "medium", max: 5, out: "tag-review.md" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--min") opts.min = argv[++i];
    else if (a === "--max") opts.max = Number(argv[++i]);
    else if (a === "--section") opts.section = argv[++i];
    else if (a === "--post") opts.post = argv[++i];
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--json") opts.json = argv[++i];
    else throw new Error(`Unknown option ${a}. See the top of scripts/tag-review.mjs.`);
  }
  if (!ORDER[opts.min]) throw new Error(`--min must be high, medium or low, not "${opts.min}"`);
  if (!(opts.max >= 1)) throw new Error("--max must be a number of 1 or more");
  return opts;
}

// One short line of why, for the report
function why(s) {
  const name = s.reasons.find((r) => r.type === "name");
  const similar = s.reasons.find((r) => r.type === "similar");
  const together = s.reasons.find((r) => r.type === "together");
  const parts = [];
  if (name) parts.push(`in the ${name.fields.join(" and ")}`);
  if (similar) parts.push(`like ${similar.posts.slice(0, 2).map((p) => `“${p.title}”`).join(" and ")}`);
  if (together) parts.push(`usually with ${together.with}`);
  return parts.join("; ");
}

const pct = (n, total) => (total ? `${Math.round((n / total) * 100)}%` : "–");
const row = (cells) => `| ${cells.map((c) => String(c).replace(/\|/g, "\\|")).join(" | ")} |`;   // a | inside a cell would split it

export function review(index, opts) {
  const { posts } = index;
  const wanted = (p) => !opts.section || p.section === opts.section || p.section.startsWith(`${opts.section}/`);

  // What to suggest for every post (a rarer spelling is swapped for the tag most people use: Future -> Futures)
  const plan = new Map();
  for (const post of posts) {
    plan.set(post, suggestFor(index, { rel: post.rel, fields: post.fields }, { known: [...post.tagKeys], limit: opts.max, min: opts.min }));
  }

  // How well connected the posts are now, and after the suggestions are applied
  const before = reach(posts);
  const after = reach(posts, (p) => new Set([...p.tagKeys, ...plan.get(p).map((s) => s.key)]));
  const lonely = (counts) => posts.filter((p) => counts.get(p) === 0);
  const average = (counts) => [...counts.values()].reduce((a, b) => a + b, 0) / (counts.size || 1);
  const thin = (counts) => posts.filter((p) => counts.get(p) < 5);   // fewer than 5 posts to move on to

  const sections = [...new Set(posts.map((p) => p.section))].sort();
  const out = [];
  const w = (line = "") => out.push(line);

  w("# Tag review");
  w();
  w(`${posts.length} posts and ${index.tags.size} tags. Suggestions are ${opts.min} confidence or better, at most ${opts.max} per post.`);
  w("Nothing has been changed. Each suggestion says why it was made, so you can accept or ignore it.");
  w();

  // ---- Summary
  w("## How connected the posts are");
  w();
  w(`A post's *reach* is how many other posts share at least one tag with it, which is what the related posts and tag pages can link to.`);
  w();
  w(row(["", "Now", "If you add the suggestions"]));
  w(row(["---", "---:", "---:"]));
  w(row(["Posts with no tag in common with any other post", `${lonely(before).length} (${pct(lonely(before).length, posts.length)})`, `${lonely(after).length} (${pct(lonely(after).length, posts.length)})`]));
  w(row(["Posts that connect to fewer than 5 others", `${thin(before).length} (${pct(thin(before).length, posts.length)})`, `${thin(after).length} (${pct(thin(after).length, posts.length)})`]));
  w(row(["Tags used on only one post", `${[...index.tags.values()].filter((t) => t.uses === 1).length}`, ""]));
  w();
  w(row(["Section", "Posts", "With tags", "Tags per post", "No reach now", "No reach after", "Posts with suggestions"]));
  w(row(["---", "---:", "---:", "---:", "---:", "---:", "---:"]));
  for (const s of sections) {
    const list = posts.filter((p) => p.section === s);
    const tagged = list.filter((p) => p.tagKeys.size).length;
    const tagTotal = list.reduce((n, p) => n + p.tagKeys.size, 0);
    w(row([`\`${s}\``, list.length, `${tagged} (${pct(tagged, list.length)})`, (tagTotal / list.length).toFixed(1),
      list.filter((p) => before.get(p) === 0).length, list.filter((p) => after.get(p) === 0).length,
      list.filter((p) => plan.get(p).length).length]));
  }
  w();
  const check = evaluate(index, { mode: "hidden" });
  w(`**How good are the suggestions?** As a test, the tags were hidden on each of ${check.posts} tagged posts and the tool was asked to guess them. ` +
    `A correct tag was in its top three for ${pct(check.postsWithAHitInTop * check.posts, check.posts)} of posts, and it found ${pct(check.recallAt5 * 100, 100)} of the tags you had chosen. ` +
    `Its other guesses count as wrong in that test even when they would be good tags you never added, so it is a cautious measure.`);
  w();

  // ---- Vocabulary
  const duplicates = likelyDuplicates(index);
  w("## Tidy the tags first");
  w();
  w("Fixing these makes existing posts join up with no new writing. Posts with the less common spelling are the ones to edit.");
  w();
  if (duplicates.length) {
    w(row(["Change this", "to this", "Why", "Posts to edit"]));
    w(row(["---", "---", "---", "---:"]));
    for (const d of duplicates) w(row([`**${d.merge.name}** (${d.merge.uses})`, `**${d.keep.name}** (${d.keep.uses})`, d.why, d.merge.uses]));
  } else w("No likely duplicates found.");
  w();
  const overlaps = (index.cfg.overlaps ?? []).map((group) => group.map((name) => index.tags.get(slugify(name))).filter(Boolean)).filter((group) => group.length >= 2);
  if (overlaps.length) {
    w("### Tags that may be the same idea");
    w();
    w("These are not typos, so it is your call. Merging them, or tagging posts with both, would join up the posts under each.");
    w();
    w(row(["Tags", "Posts"]));
    w(row(["---", "---:"]));
    for (const group of overlaps) w(row([group.map((t) => `**${t.name}** (${t.uses})`).join(" · "), new Set(posts.filter((p) => group.some((t) => p.tagKeys.has(t.key)))).size]));
    w();
  }
  const legacy = posts.filter((p) => p.legacyCategories.length);
  if (legacy.length) {
    w(`${legacy.length} posts have a \`categories:\` key (${[...new Set(legacy.flatMap((p) => p.legacyCategories))].map((v) => `\`${v}\``).join(", ")}). ` +
      `The site reads \`category:\`, so this does nothing. It looks left over from an older site and could be removed.`);
    w();
  }

  const singles = [...index.tags.values()].filter((t) => t.uses === 1);
  w(`### Tags used on one post only (${singles.length})`);
  w();
  w("A tag on one post links to nothing. Either retag the post with a tag that others share, or keep it if you plan to write more on the topic.");
  w();
  const dupOf = new Map([...canonicalTags(index)].filter(([key]) => index.tags.get(key)?.uses === 1));
  w(row(["Tag", "Post", "Could be"]));
  w(row(["---", "---", "---"]));
  for (const tag of singles.sort((a, b) => a.name.localeCompare(b.name))) {
    const post = posts.find((p) => p.tagKeys.has(tag.key));
    const merge = dupOf.get(tag.key);
    const alt = suggestFor(index, { rel: post.rel, fields: post.fields }, { known: [...post.tagKeys], limit: 2, min: "medium" });
    const could = merge ? `**${merge.name}** (${merge.uses}), same tag` : alt.length ? `also tag ${alt.map((s) => `**${s.name}**`).join(", ")}` : "keep, or leave";
    w(row([tag.name, `${post.title} (\`${post.rel}\`)`, could]));
  }
  w();

  // ---- Topics without a tag
  const topics = missingTopics(index, { limit: 20 });
  w("## Topics that come up often but have no tag");
  w();
  w("Words and phrases found in four or more posts that are not tags. Some are noise, but a real topic here is a new tag that would link all of these posts.");
  w();
  w(row(["Word or phrase", "Posts", "Examples"]));
  w(row(["---", "---:", "---"]));
  for (const t of topics) w(row([`**${t.phrase}**`, t.posts.length, t.posts.slice(0, 3).map((p) => `${p.title}`).join("; ")]));
  w();

  // ---- Per post
  w("## Suggestions by section");
  w();
  w("Within each section the posts that link to nothing come first, then the posts with the fewest tags. Tag names are written as the site already spells them; the number is how many posts use the tag.");
  w();
  const json = [];
  for (const s of sections) {
    const list = posts.filter((p) => p.section === s && wanted(p));
    const withIdeas = list.filter((p) => plan.get(p).length)
      .sort((a, b) => (before.get(a) === 0) !== (before.get(b) === 0) ? (before.get(a) === 0 ? -1 : 1) : a.tagKeys.size - b.tagKeys.size || a.rel.localeCompare(b.rel));
    const without = list.filter((p) => !plan.get(p).length);
    if (!list.length) continue;
    w(`### ${s} (${withIdeas.length} of ${list.length} posts have suggestions)`);
    w();
    for (const post of withIdeas) {
      const found = plan.get(post);
      w(`**${post.title}** · \`${post.rel}\``);
      w(`- Has: ${post.tagNames.length ? post.tagNames.join(", ") : "no tags"}${before.get(post) === 0 ? " · reaches no other post" : ""}`);
      for (const f of found) w(`- ${f.level === "high" ? "●" : f.level === "medium" ? "◐" : "○"} **${f.name}** (${f.uses}): ${why(f)}`);
      w();
      json.push({ rel: post.rel, title: post.title, has: post.tagNames, suggestions: found.map((f) => ({ tag: f.name, uses: f.uses, level: f.level, score: +f.score.toFixed(3), why: explain(f) })) });
    }
    if (without.length) {
      w(`No suggestions for ${without.length} post${without.length === 1 ? "" : "s"} here (${without.filter((p) => !p.tagKeys.size).length} untagged). ` +
        `${without.some((p) => !p.tagKeys.size) ? "Short posts give the tool little to go on, so tagging these needs your judgement." : ""}`);
      w();
    }
  }
  w("● strong match · ◐ likely · ○ possible");
  w();
  return { text: out.join("\n"), json, stats: { before: lonely(before).length, after: lonely(after).length, thinBefore: thin(before).length, thinAfter: thin(after).length } };
}

// Run from the command line (not when imported by a test)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    const index = loadIndex(root);
    if (opts.post) {
      const rel = opts.post.replace(/^source\//, "");
      const post = index.byRel.get(rel)?.post;
      if (!post) throw new Error(`No post at source/${rel}`);
      console.log(`${post.title}\nHas: ${post.tagNames.join(", ") || "no tags"}\n`);
      const found = suggestFor(index, { rel, fields: post.fields }, { known: [...post.tagKeys], min: "low" });
      if (!found.length) console.log("No suggestions: there is not enough text to go on.");
      for (const f of found) console.log(`${f.level.padEnd(6)} ${f.name} (${f.uses}): ${why(f)}`);
    } else {
      const result = review(index, opts);
      fs.writeFileSync(path.resolve(root, opts.out), result.text);
      if (opts.json) fs.writeFileSync(path.resolve(root, opts.json), JSON.stringify(result.json, null, 2));
      console.log(`Wrote ${opts.out}. Posts that link to no other post by tag: ${result.stats.before} now, ${result.stats.after} if the suggestions are applied. Posts linking to fewer than 5: ${result.stats.thinBefore} -> ${result.stats.thinAfter}.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
