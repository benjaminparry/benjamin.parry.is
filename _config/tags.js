// Tag suggestions and tag review. Plain JavaScript with no Eleventy code and no packages, so it runs anywhere
// (the review script, the Zed language server, tests). It does not read files: see tags-files.js for that.
//
// For one post, three clues are combined into a score for every tag the site already uses:
//   name     the tag's name (or an alias, like "jobs to be done" for JTBD) appears in the post's text
//   similar  the most similar posts (by the words they use) carry the tag
//   together the post already has tag A, and posts with A usually also have tag B
// Every suggestion says why it was made, so you can judge it quickly. See docs/tags.md.

import { slugify } from "./writing.js";

// ---- Front matter --------------------------------------------------------------------------------------------
// A small reader for the front matter keys this needs (title, summary, tags, category, sector ...). It understands
// the shapes used on this site: plain and quoted text, "- item" lists, [inline, lists] and > / | blocks.

const unquote = (s) => {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/\\(["\\nt\/])/g, (_, c) => ({ n: "\n", t: "\t" }[c] ?? c));
  }
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
  return t.replace(/\s+#.*$/, "");   // a plain value: drop a trailing comment
};

const scalar = (s) => {
  const v = unquote(s);
  if (v === "" || v === "~" || v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
};

function splitInline(text) {
  const items = [];
  let current = "", quote = "";
  for (const ch of text) {
    if (quote) { current += ch; if (ch === quote) quote = ""; }
    else if (ch === '"' || ch === "'") { current += ch; quote = ch; }
    else if (ch === ",") { items.push(current); current = ""; }
    else current += ch;
  }
  if (current.trim()) items.push(current);
  return items.map(scalar).filter((v) => v != null);
}

function parseValue(rest, block) {
  const first = rest.trim();
  if (first === "" || first.startsWith("#")) {
    const items = block.map((l) => l.match(/^\s*-(?:\s+(.*))?$/)).filter(Boolean).map((m) => scalar(m[1] ?? ""));
    if (items.length) return items.filter((v) => v != null);
    return block.some((l) => l.trim()) ? undefined : null;     // a nested mapping: not needed here
  }
  if (first.startsWith("[")) {
    const joined = [first, ...block.map((l) => l.trim())].join(" ").trim();
    return splitInline(joined.replace(/^\[/, "").replace(/\]\s*$/, ""));
  }
  if (/^[>|][+-]?\d*$/.test(first)) {
    const lines = block.map((l) => l.replace(/^\s+/, ""));
    const text = first.startsWith(">") ? lines.filter(Boolean).join(" ") : lines.join("\n");
    return text.trim();
  }
  const continued = block.map((l) => l.trim()).filter(Boolean);
  return scalar(continued.length ? [first, ...continued].join(" ") : first);
}

export function parseFrontMatter(text) {
  const src = String(text ?? "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const m = src.match(/^---[ \t]*\n(?:([\s\S]*?)\n)?---[ \t]*(?:\n|$)/);
  if (!m) return { data: {}, body: src };
  const lines = (m[1] ?? "").split("\n");
  const data = {};
  for (let i = 0; i < lines.length;) {
    const km = lines[i].match(/^([A-Za-z_][\w.-]*):(?:[ \t]+(.*))?$/);
    if (!km) { i++; continue; }
    const block = [];
    i++;
    while (i < lines.length && (lines[i] === "" || /^[ \t]/.test(lines[i]) || /^-(?:[ \t]|$)/.test(lines[i]))) block.push(lines[i++]);
    const value = parseValue(km[2] ?? "", block);
    if (value !== undefined) data[km[1]] = value;
  }
  return { data, body: src.slice(m[0].length) };
}

// A value as a list of non-empty strings: null -> [], "A" -> ["A"], ["A", "B"] -> ["A", "B"]
export const listOf = (value) =>
  [].concat(value ?? []).map((v) => String(v).trim()).filter(Boolean);

// ---- Words ---------------------------------------------------------------------------------------------------
const STOP = new Set(`a about above after again against all also am an and any are as at be because been before being
below between both but by can could did do does doing down during each few for from further had has have having he her
here hers him his how i if in into is it its just like me more most my no nor not now of off on once only or other our
out over own same she should so some such than that the their them then there these they this those through to too
under until up very was we were what when where which while who whom why will with would you your yours really
get got one two also still even much many make made thing things way ways use used using lot new`.split(/\s+/));

// A light stemmer: "researching", "researched", "researches" and "research" all become "research".
// It only needs to be consistent, because tag names and text go through the same function.
export function stem(word) {
  let w = word;
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) w = w.slice(0, -3) + "y";
  else if (/(ch|sh|x|z|ss)es$/.test(w)) w = w.slice(0, -2);
  else if (w.endsWith("ing") && w.length > 5) w = undouble(w.slice(0, -3));
  else if (w.endsWith("ed") && w.length > 4) w = undouble(w.slice(0, -2));
  else if (w.endsWith("s") && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}
const undouble = (w) => (/([^aeiou])\1$/.test(w) && !/(ss|ll|zz)$/.test(w) ? w.slice(0, -1) : w);

// "Research by the Sea!" -> ["research", "by", "the", "sea"]   (stopwords kept: phrases need them)
export function words(text) {
  return String(text ?? "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .match(/[a-z0-9]+/g)?.map(stem) ?? [];
}

const stemmedStops = new Set([...STOP].map(stem));
const isContent = (w) => w.length > 2 && !stemmedStops.has(w) && !/^\d+$/.test(w);

// Markdown and template syntax out, readable text left
export function cleanMarkdown(md) {
  return String(md ?? "")
    .replace(/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}|\{#[\s\S]*?#\}/g, " ")
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/^\s*\[[^\]]+\]:\s+\S+.*$/gm, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[*~>#|]+/g, " ");
}

// ---- Posts ---------------------------------------------------------------------------------------------------
// The folders that hold posts, and the ones to leave out (pages, templates, data)
const SKIP = /^(?:_includes|_data|pages|tagging)\//;

export function sectionOf(rel) {
  const parts = rel.split("/");
  if (parts.length === 1) return "(root)";
  return parts[0] === "collecting" && parts.length > 2 ? `collecting/${parts[1]}` : parts[0];
}

export const isPostPath = (rel) => /\.md$/i.test(rel) && rel.includes("/") && !SKIP.test(rel);

// rel: the path inside source/, like "writing/2025-11-06-trails-of-experience.md"
export function makePost({ rel, text }) {
  const { data, body } = parseFrontMatter(text);
  const tagNames = [];
  const seen = new Set();
  for (const name of [...listOf(data.tags), ...listOf(data.sector)]) {   // sector counts as a tag on this site
    const key = slugify(name);
    if (key && !seen.has(key)) { seen.add(key); tagNames.push(name); }
  }
  return {
    rel,
    section: sectionOf(rel),
    title: listOf(data.title)[0] ?? rel.split("/").pop().replace(/\.md$/, ""),
    category: listOf(data.category)[0],
    draft: data.draft === true,
    legacyCategories: listOf(data.categories),   // an old key from a previous site: the site reads "category", not this
    tagNames,
    tagKeys: seen,
    fields: {
      title: listOf(data.title).join(" "),
      summary: listOf(data.summary).join(" "),
      body: cleanMarkdown(body),
    },
  };
}

// ---- The index -----------------------------------------------------------------------------------------------
export const defaults = {
  minUses: 2,          // a tag must be on this many posts before its name is looked for in other posts
  neighbours: 10,      // how many similar posts get a say
  minSimilarity: 0.1,  // ignore posts less similar than this
  shortText: 15,       // a post with fewer different words than this counts as short
  fullSimilarity: 0.15, // posts this alike count in full; less alike count for proportionally less
  limit: 8,            // suggestions per post
  weights: { name: 0.9, similar: 1, together: 0.5 },
  togetherMinCount: 3,       // "together" needs this many posts with both tags ...
  togetherMinConfidence: 0.4, // ... and this share of the posts with the first tag to also have the second
  levels: { high: 0.6, medium: 0.4, low: 0.25 },
  aliases: {},         // { "jtbd": ["jobs to be done"] } other ways of writing a tag
  onlyIn: {},          // { "working": ["retail", "finance"] } tags that are only suggested for posts in that section
  overlaps: [],        // [["UX", "User Experience"]] tags that may be one idea, listed in the review for you to decide
  ignore: [],          // tags that are never suggested, like "cycles"
};

export function buildIndex(posts, config = {}) {
  const cfg = { ...defaults, ...config, weights: { ...defaults.weights, ...config.weights }, levels: { ...defaults.levels, ...config.levels } };
  const ignore = new Set(cfg.ignore.map(slugify));

  // Tags: how many posts, and the spelling used most
  const tags = new Map();
  for (const post of posts) {
    for (const name of post.tagNames) {
      const key = slugify(name);
      if (!tags.has(key)) tags.set(key, { key, names: new Map(), uses: 0, sections: new Map() });
      const tag = tags.get(key);
      tag.uses++;
      tag.names.set(name, (tag.names.get(name) ?? 0) + 1);
      tag.sections.set(post.section, (tag.sections.get(post.section) ?? 0) + 1);
    }
  }
  for (const tag of tags.values()) tag.name = [...tag.names].sort((a, b) => b[1] - a[1])[0][0];

  // Words each tag can be found by: its own name and any aliases
  const phraseStart = new Map();   // first word -> [{ key, words }]
  for (const tag of tags.values()) {
    if (tag.uses < cfg.minUses || ignore.has(tag.key)) continue;
    const spellings = [tag.name, ...(cfg.aliases[tag.key] ?? [])];
    for (const spelling of spellings) {
      const w = words(spelling);
      if (!w.length) continue;
      if (!phraseStart.has(w[0])) phraseStart.set(w[0], []);
      phraseStart.get(w[0]).push({ key: tag.key, words: w });
    }
  }

  // Each post's words: for phrase matching (every word, in order) and for similarity (content words, counted)
  const docs = posts.map((post) => ({ post, ...analyse(post.fields, { phraseStart }) }));
  const df = new Map();
  for (const doc of docs) for (const term of doc.counts.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  const N = docs.length;
  const idf = (term) => Math.log((N + 1) / ((df.get(term) ?? 0) + 1)) + 1;

  const index = { cfg, posts, docs, tags, phraseStart, df, N, idf, inverted: new Map(), byRel: new Map(), together: new Map(), nameDf: new Map() };

  for (const doc of docs) {
    doc.vector = vectorOf(doc.counts, idf);
    index.byRel.set(doc.post.rel, doc);
    for (const [term, weight] of doc.vector.weights) {
      if (!index.inverted.has(term)) index.inverted.set(term, []);
      index.inverted.get(term).push([doc, weight]);
    }
    for (const key of doc.hits.keys()) index.nameDf.set(key, (index.nameDf.get(key) ?? 0) + 1);
  }

  // Tag pairs: how often A and B are on the same post
  for (const post of posts) {
    const keys = [...post.tagKeys];
    for (const a of keys) for (const b of keys) if (a !== b) {
      const k = `${a}\u0000${b}`;
      index.together.set(k, (index.together.get(k) ?? 0) + 1);
    }
  }
  return index;
}

const FIELD_WEIGHT = { title: 3, summary: 2, body: 1 };

// The words of a post, ready to compare
function analyse(fields, { phraseStart }) {
  const streams = { title: words(fields.title), summary: words(fields.summary), body: words(fields.body) };

  // Tag names found in the text: key -> { field: count }
  const hits = new Map();
  for (const [field, tokens] of Object.entries(streams)) {
    for (let i = 0; i < tokens.length; i++) {
      for (const phrase of phraseStart.get(tokens[i]) ?? []) {
        if (phrase.words.every((w, j) => tokens[i + j] === w)) {
          if (!hits.has(phrase.key)) hits.set(phrase.key, {});
          const h = hits.get(phrase.key);
          h[field] = (h[field] ?? 0) + 1;
        }
      }
    }
  }

  // Content words, counted, with the title and summary counting for more
  const counts = new Map();
  for (const [field, tokens] of Object.entries(streams)) {
    for (const token of tokens) if (isContent(token)) counts.set(token, (counts.get(token) ?? 0) + FIELD_WEIGHT[field]);
  }
  return { hits, counts, size: counts.size };
}

function vectorOf(counts, idf) {
  const weights = new Map();
  let norm = 0;
  for (const [term, count] of counts) {
    const w = (1 + Math.log(count)) * idf(term);
    weights.set(term, w);
    norm += w * w;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [term, w] of weights) weights.set(term, w / norm);
  return { weights };
}

// ---- Suggestions ---------------------------------------------------------------------------------------------
// query:   { fields: { title, summary, body }, rel?, section?, fresh? }   rel leaves that post out of what it is compared with
// known:   the tags it already has (names or slugs). They are not suggested again.
export function suggest(index, query, { known = [], limit, exclude = [] } = {}) {
  const { cfg } = index;
  const max = limit ?? cfg.limit;
  const knownKeys = new Set(known.map(slugify));
  const own = query.rel ? index.byRel.get(query.rel) : undefined;
  const section = query.section ?? own?.post.section;
  const skip = new Set([...exclude, ...cfg.ignore].map(slugify));
  // tags that belong to one section only (like the client sectors on /working/) are not offered elsewhere
  for (const [only, keys] of Object.entries(cfg.onlyIn)) if (section !== only) for (const key of keys) skip.add(slugify(key));
  const me = own?.post.tagKeys ?? new Set();             // this post's own entries in the counts, taken back out
  const reuse = own && !query.fresh;   // fresh: the text was edited since the index was built, so read it again
  const doc = reuse ? own : analyse(query.fields, index);
  const vector = reuse ? own.vector : vectorOf(doc.counts, index.idf);
  const usesOf = (key) => (index.tags.get(key)?.uses ?? 0) - (me.has(key) ? 1 : 0);
  const candidates = new Map();
  const entry = (key) => {
    if (!candidates.has(key)) candidates.set(key, { key, name: index.tags.get(key)?.name ?? key, name_: 0, similar: 0, together: 0, reasons: [] });
    return candidates.get(key);
  };

  // 1. the tag's name is in the text
  for (const [key, found] of doc.hits) {
    if (knownKeys.has(key) || skip.has(key) || usesOf(key) < cfg.minUses) continue;
    let raw = 0;
    for (const [field, count] of Object.entries(found)) raw += FIELD_WEIGHT[field] * (1 + Math.log(count));
    // a word that is in a lot of posts says little: damp it unless it is in the title or summary
    const share = (index.nameDf.get(key) ?? 0) / index.N;
    const common = share > 0.25 ? 0.35 : share > 0.1 ? 0.6 : 1;
    const inTitle = found.title || found.summary;
    // ... and a tag whose name is in many posts that do not carry it is probably an everyday word ("time", "tools"):
    // compare the posts that are tagged with the posts that mention it (not counting this post)
    const mentioned = Math.max(1, (index.nameDf.get(key) ?? 0) - (own?.hits.has(key) ? 1 : 0));
    const trust = Math.min(1, (usesOf(key) / mentioned) * 3);
    const calibrated = (inTitle ? 0.55 : 0.35) + (inTitle ? 0.45 : 0.65) * trust;
    const score = (1 - Math.exp(-raw / 3)) * (inTitle ? 1 : common) * calibrated;
    const c = entry(key);
    c.name_ = score;
    c.reasons.push({ type: "name", fields: Object.keys(found) });
  }

  // 2. similar posts carry the tag
  if (doc.size >= 6) {
    const scores = new Map();
    for (const [term, weight] of vector.weights) {
      for (const [other, w] of index.inverted.get(term) ?? []) {
        if (other.post.rel === query.rel) continue;
        scores.set(other, (scores.get(other) ?? 0) + weight * w);
      }
    }
    const near = [...scores].filter(([, sim]) => sim >= cfg.minSimilarity).sort((a, b) => b[1] - a[1]).slice(0, cfg.neighbours);
    const total = near.reduce((sum, [, sim]) => sum + sim, 0);
    // how alike the closest posts really are: weakly similar posts say little
    const strength = Math.min(1, (near.slice(0, 3).reduce((sum, [, sim]) => sum + sim, 0) / Math.max(1, Math.min(3, near.length))) / cfg.fullSimilarity);
    // a very short post gives little to compare, so similar posts are trusted less
    const shortText = doc.size >= cfg.shortText ? 1 : 0.6;
    const votes = new Map();
    for (const [other, sim] of near) for (const key of other.post.tagKeys) {
      if (knownKeys.has(key) || skip.has(key)) continue;
      if (!votes.has(key)) votes.set(key, []);
      votes.get(key).push({ post: other.post, sim });
    }
    for (const [key, voters] of votes) {
      const share = voters.reduce((sum, v) => sum + v.sim, 0) / (total || 1);
      const best = Math.max(...voters.map((v) => v.sim));
      // two or more similar posts, or one that is very close
      if (voters.length < 2 && best < 0.3) continue;
      const c = entry(key);
      c.similar = Math.min(1, share * (voters.length >= 2 ? 1.2 : 0.8)) * strength * shortText;
      c.reasons.push({ type: "similar", posts: voters.sort((a, b) => b.sim - a.sim).slice(0, 3).map((v) => ({ rel: v.post.rel, title: v.post.title, sim: v.sim })) });
    }
  }

  // 3. posts with the tags it already has usually have this one too
  for (const a of knownKeys) {
    const usesA = usesOf(a);
    if (usesA < 3) continue;
    for (const [pair, together] of index.together) {
      if (!pair.startsWith(`${a}\u0000`)) continue;
      const b = pair.slice(a.length + 1);
      if (knownKeys.has(b) || skip.has(b)) continue;
      const count = together - (me.has(a) && me.has(b) ? 1 : 0);
      const confidence = count / usesA;
      if (count < cfg.togetherMinCount || confidence < cfg.togetherMinConfidence || usesOf(b) < cfg.minUses) continue;
      const c = entry(b);
      if (confidence > c.together) {
        c.together = confidence;
        c.reasons = c.reasons.filter((r) => r.type !== "together");
        c.reasons.push({ type: "together", with: index.tags.get(a)?.name ?? a, confidence, count, of: usesA });
      }
    }
  }

  const { weights, levels } = cfg;
  const results = [];
  for (const c of candidates.values()) {
    if (!(usesOf(c.key) >= 1)) continue;
    const score = 1 - (1 - weights.name * c.name_) * (1 - weights.similar * c.similar) * (1 - weights.together * c.together);
    if (score < levels.low) continue;
    results.push({
      key: c.key,
      name: c.name,
      uses: usesOf(c.key),
      score,
      level: score >= levels.high ? "high" : score >= levels.medium ? "medium" : "low",
      reasons: c.reasons,
    });
  }
  return results.sort((a, b) => b.score - a.score || b.uses - a.uses || a.name.localeCompare(b.name)).slice(0, max);
}

// suggest(), then tidied for use: a rarer spelling is swapped for the tag most people use (Future -> Futures),
// repeats are dropped, and only suggestions at or above `min` ("high", "medium" or "low") are kept.
export function suggestFor(index, query, { known = [], limit, min = "low" } = {}) {
  const rank = { high: 3, medium: 2, low: 1 };
  index.canonical ??= canonicalTags(index);
  const knownKeys = new Set(known.map(slugify));
  const seen = new Set();
  return suggest(index, query, { known, limit: (limit ?? index.cfg.limit) + 6 })
    .filter((s) => rank[s.level] >= rank[min])
    .map((s) => { const main = index.canonical.get(s.key); return main ? { ...s, key: main.key, name: main.name, uses: main.uses } : s; })
    .filter((s) => !knownKeys.has(s.key) && !seen.has(s.key) && seen.add(s.key))
    .slice(0, limit ?? index.cfg.limit);
}

// A short sentence about why: "named in the title; similar to Post A and Post B"
export function explain(suggestion) {
  const parts = [];
  for (const r of suggestion.reasons) {
    if (r.type === "name") parts.push(`mentioned in the ${r.fields.join(" and ")}`);
    if (r.type === "similar") parts.push(`similar posts: ${r.posts.map((p) => p.title).join("; ")}`);
    if (r.type === "together") parts.push(`${r.count} of ${r.of} posts tagged ${r.with} also have it`);
  }
  return parts.join(" · ");
}

// ---- Checking the suggestions against the tags you have already chosen ---------------------------------------
// For each tagged post: hide its tags, ask for suggestions, see how many of its real tags come back.
// mode "hidden":  no tags known, so only name and similarity are used.
// mode "partial": one tag is hidden and the rest are known, so "together" is used too.
export function evaluate(index, { mode = "hidden", top = 3, sample } = {}) {
  const never = new Set(index.cfg.ignore.map(slugify));   // tags the tool is told not to suggest cannot be asked for
  let posts = index.posts.filter((p) => [...p.tagKeys].some((k) => !never.has(k) && (index.tags.get(k)?.uses ?? 0) >= 2));
  if (sample) posts = posts.filter((_, i) => i % Math.ceil(posts.length / sample) === 0);
  let hits = 0, shown = 0, wanted = 0, found = 0, anyHit = 0, counted = 0;
  for (const post of posts) {
    // only tags that other posts also have can be recovered
    const real = [...post.tagKeys].filter((k) => !never.has(k) && (index.tags.get(k)?.uses ?? 0) - 1 >= index.cfg.minUses);
    if (!real.length) continue;
    const hide = mode === "partial" ? [real[0]] : real;
    const known = [...post.tagKeys].filter((k) => !hide.includes(k));
    const got = suggest(index, { rel: post.rel, fields: post.fields }, { known, limit: 5 });
    const topN = got.slice(0, top);
    counted++;
    wanted += hide.length;
    found += got.filter((s) => hide.includes(s.key)).length;
    hits += topN.filter((s) => hide.includes(s.key)).length;
    shown += topN.length;
    if (topN.some((s) => hide.includes(s.key))) anyHit++;
  }
  return {
    posts: counted,
    precisionAtTop: shown ? hits / shown : 0,
    recallAt5: wanted ? found / wanted : 0,
    postsWithAHitInTop: counted ? anyHit / counted : 0,
    top,
  };
}

// ---- Looking after the vocabulary ----------------------------------------------------------------------------
// Tags that look like the same thing written two ways, or a typo of a tag used more often
export function likelyDuplicates(index) {
  const all = [...index.tags.values()];
  const stemKey = (tag) => words(tag.name).join(" ");
  const pairs = [];
  const add = (a, b, why) => {
    const [big, small] = a.uses >= b.uses ? [a, b] : [b, a];
    pairs.push({ keep: big, merge: small, why });
  };
  const seen = new Set();
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      const id = [a.key, b.key].sort().join("|");
      if (seen.has(id)) continue;
      const why = relation(a, b, stemKey);
      if (why) { seen.add(id); add(a, b, why); }
    }
  }
  return pairs.sort((x, y) => y.merge.uses + y.keep.uses - (x.merge.uses + x.keep.uses));
}


// Is one tag a respelling of the other? Returns the reason, or null.
// Two letters apart only counts for long words that start the same way, so "quantitive" and "quantitative"
// match but "qualitative" and "quantitative", or "confidence" and "conference", do not.
function relation(a, b, stemKey = (t) => words(t.name).join(" ")) {
  const x = a.key.replace(/-/g, ""), y = b.key.replace(/-/g, "");
  if (stemKey(a) === stemKey(b)) return "singular or plural";
  if (x === y) return "same letters, different spacing";
  if (spellingVariant(a.key, b.key)) return "UK and US spelling";
  const shortest = Math.min(x.length, y.length);
  if (shortest >= 5) {
    const d = editDistance(x, y);
    if (d <= 1 || (d === 2 && shortest >= 9 && x.slice(0, 6) === y.slice(0, 6))) return "looks like a typo";
  }
  return null;
}

const spellingVariant = (a, b) => {
  const norm = (s) => s.replace(/our/g, "or").replace(/ise/g, "ize").replace(/isation/g, "ization").replace(/yse/g, "yze");
  return a !== b && norm(a) === norm(b);
};

export function editDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = temp;
    }
  }
  return prev[b.length];
}

// Tags in the index close to a tag name you typed: used to catch "Quantitive" when "Quantitative" exists
export function closestTags(index, name, { limit = 3 } = {}) {
  const probe = { key: slugify(name), name };
  const out = [];
  for (const tag of index.tags.values()) {
    if (tag.key === probe.key) continue;
    const why = relation(tag, probe);
    if (why) out.push({ tag, why });
  }
  return out.sort((x, y) => y.tag.uses - x.tag.uses).slice(0, limit);
}

// Tags that are respellings of a more used tag: Map(key of the rarer one -> the tag to use instead)
export function canonicalTags(index) {
  const map = new Map();
  for (const d of likelyDuplicates(index)) if (d.keep.uses > d.merge.uses) map.set(d.merge.key, d.keep);
  return map;
}

// How many other posts share at least one tag with each post (the posts a reader could reach from it by tag)
export function reach(posts, tagKeysOf = (p) => p.tagKeys) {
  const byTag = new Map();
  for (const post of posts) for (const key of tagKeysOf(post)) {
    if (!byTag.has(key)) byTag.set(key, new Set());
    byTag.get(key).add(post);
  }
  const counts = new Map();
  for (const post of posts) {
    const others = new Set();
    for (const key of tagKeysOf(post)) for (const other of byTag.get(key) ?? []) if (other !== post) others.add(other);
    counts.set(post, others.size);
  }
  return counts;
}

// Everyday words that are never a useful tag, on top of the stopwords
const GENERIC = new Set(`look forward interest interesting project build process create thought better watch might last year blog
post digital opportunity around something going world focus another point problem approach excited excite result understand
pressure little week weekly month time work working people thing good great really today next first second back think need want
feel feeling start started finish finished idea able available different important enough actually probably maybe course part
place line level kind sort type read reading write talk talking help share sharing find found take taking give keep come seem
become team user customer product service content data tool method question answer story change changes lots bits
happened happening bring brought learn learned learning learnt join joined joining meet meeting week's weeks days lunch
morning afternoon evening later early earlier recent recently ago since while whole folks episode enjoyed record close deleted example https http www guide features feature session sessions thanks thank setup decision decisions group groups participants participant designers designer researcher researchers finally practice explore happy listen delivering deliver challenge challenges discussion mention mentioned attend attended myself yourself himself herself themselves avoid based every everything everyone anyone nothing number small support supported asking asked ask conversation conversations spending spend files file already always never often usually quite rather though although whether without within across ever simply perhaps instead sure certain real general common simple easy hard long short high low open full free large big huge major main key single double multiple several various particular specific current currently existing following include included including provide provided providing allow allowed allowing require required making makes taken taking showing shown shows especially exactly directly mostly likely unlikely definitely totally completely basically generally typically luckily thankfully obviously clearly certainly absolutely entirely almost nearly hopefully fortunately unfortunately overall anyway anything something somewhere somehow whatever whenever wherever however therefore otherwise besides meanwhile`.split(/\s+/).map((w) => stem(w.replace(/'/g, ""))));

// Words and two-word phrases that several posts are *about* (in the title or summary, or used at least twice)
// but that are not a tag yet. A phrase shown as written, not as the stem it was matched by.
export function missingTopics(index, { minPosts = 4, minAbout = 3, maxShare = 0.07, limit = 30 } = {}) {
  const known = new Set();
  for (const tag of index.tags.values()) {
    known.add(words(tag.name).join(" "));
    for (const w of words(tag.name)) known.add(w);
  }
  const raw = (text) => String(text ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['\u2019]/g, "").match(/[a-z0-9]+/g) ?? [];
  const phrases = new Map();   // phrase (stems) -> { posts, about, shown: Map(surface -> count) }
  for (const post of index.posts) {
    const found = new Map();   // phrase -> { score, shown }
    const scan = (text, weight) => {
      const tokens = raw(text);
      const stems = tokens.map(stem);
      for (let i = 0; i < tokens.length; i++) {
        const grams = [[stems[i], tokens[i]]];
        if (i + 1 < tokens.length) grams.push([`${stems[i]} ${stems[i + 1]}`, `${tokens[i]} ${tokens[i + 1]}`]);
        for (const [key, shown] of grams) {
          const parts = key.split(" ");
          if (!parts.every((w) => isContent(w) && !GENERIC.has(w))) continue;
          if (parts.length === 1 && tokens[i].length < 5) continue;
          if (!found.has(key)) found.set(key, { score: 0, shown });
          found.get(key).score += weight;
        }
      }
    };
    scan(post.fields.title, 3);
    scan(post.fields.summary, 3);
    scan(post.fields.body, 1);
    for (const [key, f] of found) {
      if (!phrases.has(key)) phrases.set(key, { posts: new Set(), about: 0, shown: new Map() });
      const entry = phrases.get(key);
      entry.posts.add(post);
      if (f.score >= 2) entry.about++;
      entry.shown.set(f.shown, (entry.shown.get(f.shown) ?? 0) + 1);
    }
  }
  const out = [];
  for (const [key, entry] of phrases) {
    if (entry.posts.size < minPosts || entry.about < minAbout || entry.posts.size > index.N * maxShare || known.has(key)) continue;
    const parts = key.split(" ");
    if (parts.length > 1 && parts.every((w) => known.has(w))) continue;   // made of words that are tags already
    const shown = [...entry.shown].sort((a, b) => b[1] - a[1])[0][0];
    out.push({ phrase: shown, key, posts: [...entry.posts], about: entry.about, score: entry.about * (parts.length > 1 ? 1.5 : 1) * Math.log(index.N / entry.posts.size) });
  }
  // a word is dropped when a phrase containing it is about as common
  const multi = out.filter((o) => o.key.includes(" "));
  const kept = out.filter((o) => o.key.includes(" ") || !multi.some((m) => m.key.split(" ").includes(o.key) && m.posts.length >= o.posts.length * 0.7));
  return kept.sort((a, b) => b.score - a.score).slice(0, limit);
}
