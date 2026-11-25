// Tests for the tag tools: node scripts/tags-test.mjs
import { makeSite } from "./tags-test-site.mjs";
import { loadIndex } from "../_config/tags-files.js";
import {
  parseFrontMatter, listOf, stem, words, makePost, buildIndex, suggest, suggestFor, evaluate, likelyDuplicates,
  closestTags, canonicalTags, reach, missingTopics, editDistance, sectionOf, isPostPath,
} from "../_config/tags.js";
import { yamlScalar, linesOf, frontMatterRange, keyBlock, completionContext, addTagsEdit, replaceTagEdit } from "../_config/tags-editor.js";

let n = 0, ok = 0;
const check = (name, cond, detail) => { n++; if (cond) ok++; else console.log("FAIL", name, detail ?? ""); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- Front matter
const fm = (text) => parseFrontMatter(text).data;
check("block list", same(listOf(fm("---\ntags:\n  - A\n  - B C\n---\nx").tags), ["A", "B C"]));
check("block list with the dash in column 0", same(listOf(fm("---\ntags:\n- A\n- B\ntitle: t\n---\n").tags), ["A", "B"]));
check("inline list with quotes and a comma", same(listOf(fm('---\ntags: [A, "B, C", \'D\']\n---\n').tags), ["A", "B, C", "D"]));
check("single value", same(listOf(fm("---\ntags: Research\n---\n").tags), ["Research"]));
check("empty tags is no tags", same(listOf(fm("---\ntags:\ntitle: x\n---\n").tags), []));
check("quoted title with a colon, and a comment", fm('---\ntitle: "Cycles: 2025"\ncategory: People # note\n---\n').title === "Cycles: 2025" && fm('---\ncategory: People # note\n---\n').category === "People");
check("folded summary", fm("---\nsummary: >\n  one\n  two\n---\n").summary === "one two");
check("a quote that continues on the next line", fm('---\nsummary: "one\n  two"\n---\n').summary === "one two");
check("CRLF line endings", same(listOf(fm("---\r\ntags:\r\n  - A\r\n---\r\nbody").tags), ["A"]));
check("no front matter", same(parseFrontMatter("just text").data, {}) && parseFrontMatter("just text").body === "just text");
check("empty front matter", same(parseFrontMatter("---\n---\nbody").data, {}) && parseFrontMatter("---\n---\nbody").body === "body");
check("nested mappings are skipped without breaking later keys", fm("---\nhero:\n  image: a.jpg\ntags:\n  - A\n---\n").tags[0] === "A");
const sector = makePost({ rel: "working/x.md", text: "---\ntitle: X\ntags:\n  - A\nsector:\n  - Retail\n  - a\n---\n" });
check("sector counts as a tag, and repeats count once", same(sector.tagNames, ["A", "Retail"]));

// ---- Words
check("stems agree", stem("researching") === stem("researched") && stem("researches") === stem("research") && stem("planning") === stem("planned") && stem("methods") === stem("method"));
check("words keeps stopwords in order", same(words("Research by the Sea"), ["research", "by", "the", "sea"]));
check("paths and sections", sectionOf("collecting/thoughts/a.md") === "collecting/thoughts" && sectionOf("writing/a.md") === "writing" && isPostPath("writing/a.md") && !isPostPath("pages/a.md") && !isPostPath("_data/a.md") && !isPostPath("index.md"));
check("editDistance", editDistance("kitten", "sitting") === 3 && editDistance("a", "a") === 0);

// ---- The engine, on a small site
const site = makeSite();
const index = loadIndex(site.root);
check("reads posts, not pages", index.posts.length === 25 && !index.byRel.has("pages/about.md"), index.posts.length);
const q = (title, summary, body, extra = {}) => ({ fields: { title, summary, body }, ...extra });

let got = suggest(index, q("Checking a website for accessibility", "", "I used a screen reader and keyboard focus.", { section: "writing" }), { known: [] });
check("a tag named in the title comes first", got[0]?.key === "accessibility" && got[0].reasons.some((r) => r.type === "name"), got.map((s) => s.key));
got = suggest(index, q("Notes on my own site", "Owning my content", "Webmentions arrive on my homepage, and I am syndicating posts to Mastodon with POSSE. Setting up the endpoint on a static site took an afternoon, and replies now show under each post."), { known: [] });
check("similar posts suggest a tag the text never names", got[0]?.key === "indieweb" && got[0].reasons.some((r) => r.type === "similar"), got.map((s) => s.key));
got = suggest(index, q("Checking a website for accessibility", "", "screen reader keyboard"), { known: ["Accessibility"] });
check("tags already on the post are not suggested", !got.some((s) => s.key === "accessibility"));
got = suggest(index, q("Pages", "", "pages pages pages"), { known: [] });
check("ignored tags are never suggested", !got.some((s) => s.key === "pages"));
got = suggest(index, q("Some user research with a few people", "", "I did some user research."), { known: [] });
check("aliases are found", got.some((s) => s.key === "research" && s.reasons.some((r) => r.type === "name")), got.map((s) => s.key));
got = suggest(index, q("A note", "", "Tokyo ramen trains and shrines while travelling in Japan."), { known: ["Japan"] });
check("together: posts with Japan are usually tagged Travel", got.some((s) => s.key === "travel" && s.reasons.some((r) => r.type === "together")), got.map((s) => `${s.key}:${s.reasons.map((r) => r.type)}`));

const rel = "writing/2024-02-01-untagged-a11y.md";
const self = index.byRel.get(rel).post;
got = suggest(index, { rel, fields: self.fields }, { known: [] });
check("a post in the index is compared with the others, never with itself", got[0]?.key === "accessibility" && !got.some((s) => s.reasons.some((r) => r.posts?.some((p) => p.rel === rel))));
const sameAgain = suggest(index, { rel, fields: self.fields, fresh: true }, { known: [] });
const edited = suggest(index, { rel, fields: { title: "A trip", summary: "Tokyo", body: "Ramen in Tokyo and the Kyoto temples while travelling around Japan, riding trains from Osaka to Hakone." }, fresh: true }, { known: [] });
check("fresh text replaces the saved text", sameAgain[0]?.key === "accessibility" && edited[0]?.key === "japan", edited.map((s) => s.key));

const fenced = buildIndex(index.posts, { ...index.cfg, onlyIn: { working: ["accessibility"] } });
check("onlyIn hides the tag elsewhere and shows it in its section",
  !suggest(fenced, { ...q("Accessibility", "", "screen reader accessibility"), section: "writing" }, { known: [] }).some((s) => s.key === "accessibility") &&
  suggest(fenced, { ...q("Accessibility", "", "screen reader accessibility"), section: "working" }, { known: [] }).some((s) => s.key === "accessibility"));
check("a short, vague text gives few or no suggestions", suggest(index, q("Hello", "", "Hi."), { known: [] }).length === 0);

const result = evaluate(index, { mode: "hidden" });
check("the accuracy test runs and finds the tags", result.posts > 15 && result.postsWithAHitInTop > 0.8 && result.recallAt5 > 0.6, JSON.stringify(result));

// ---- The vocabulary
const posts = [
  ["A", "Quantitative"], ["B", "Quantitative"], ["C", "Quantitative"], ["D", "Quantitive"], ["E", "Qualitative"], ["F", "Qualitative"],
  ["G", "Futures"], ["H", "Future"], ["I", "Futures"], ["J", "Conference"], ["K", "Unconference"], ["L", "Conference"], ["M", "Confidence"],
].map(([title, tag]) => makePost({ rel: `writing/${title}.md`, text: `---\ntitle: ${title}\ntags:\n  - ${tag}\n---\nBody ${title}` }));
const vocab = buildIndex(posts, {});
const pairs = likelyDuplicates(vocab).map((d) => `${d.merge.name}>${d.keep.name}`);
check("finds a typo, a plural and nothing else", pairs.includes("Quantitive>Quantitative") && pairs.includes("Future>Futures") && pairs.length === 2, pairs);
check("different words two letters apart are left alone", !pairs.some((p) => /Qualitative|Unconference|Confidence/.test(p)), pairs);
check("closestTags catches a typo as you type", closestTags(vocab, "Quantatative").some((c) => c.tag.key === "quantitative"));
check("closestTags: exact tags are not flagged", !closestTags(vocab, "Quantitative").some((c) => c.tag.key === "quantitative"));
check("closestTags: unrelated words find nothing", closestTags(vocab, "Gardening").length === 0);
check("canonical swaps the rarer spelling", canonicalTags(vocab).get("future")?.name === "Futures" && canonicalTags(vocab).get("quantitive")?.name === "Quantitative");
const swapped = suggestFor(buildIndex([...posts, ...posts.slice(6, 9)], {}), q("Futures and the future", "", "futures"), { known: [] });
check("suggestFor never offers both spellings", swapped.filter((s) => /^futures?$/.test(s.key)).length <= 1, swapped.map((s) => s.key));

const links = reach(index.posts);
check("reach counts posts sharing a tag", links.get(index.byRel.get(rel).post) === 0 && [...links.values()].some((c) => c >= 5));
const topical = [...Array(5)].map((_, i) => makePost({ rel: `writing/g${i}.md`, text: `---\ntitle: Garden diary ${i}\ntags:\n  - Other\n---\nThe biodiversity of my garden: biodiversity grows when the pond and the hedge are left alone.` }));
const noise = [...Array(100)].map((_, i) => makePost({ rel: `writing/n${i}.md`, text: `---\ntitle: Note ${i}\ntags:\n  - Other\n---\nSomething happened today number ${i}.` }));
const topics = missingTopics(buildIndex([...topical, ...noise], {}));
check("missingTopics finds a subject several posts are about", topics.some((t) => t.phrase === "biodiversity"), topics.map((t) => t.phrase));
check("missingTopics shows real words, not stems", topics.every((t) => !/\b(creat|someth|littl)\b/.test(t.phrase)));
site.cleanup();

// ---- Editing
check("yamlScalar quotes only when it must", yamlScalar("Research") === "Research" && yamlScalar("Note-taking") === "Note-taking" && yamlScalar("C#") === "C#" && yamlScalar("Q: and A") === '"Q: and A"' && yamlScalar("yes") === '"yes"' && yamlScalar("#tag") === '"#tag"' && yamlScalar("A, B") === "A, B");
const apply = (text, edit) => {
  const lines = text.split("\n");
  const offset = (p) => lines.slice(0, p.line).reduce((sum, l) => sum + l.length + 1, 0) + p.character;
  return text.slice(0, offset(edit.range.start)) + edit.newText + text.slice(offset(edit.range.end));
};
const tagsAfter = (text, names) => listOf(parseFrontMatter(apply(text, addTagsEdit(text, names))).data.tags);
check("adds to a block list", same(tagsAfter("---\ntitle: T\ntags:\n  - A\n---\nBody", ["B", "C"]), ["A", "B", "C"]));
check("adds to a block list with the dash in column 0", same(tagsAfter("---\ntags:\n- A\ntitle: T\n---\nBody", ["B"]), ["A", "B"]));
check("adds to a list that is followed by other keys, keeping them", apply("---\ntags:\n  - A\ntitle: T\n---\n", addTagsEdit("---\ntags:\n  - A\ntitle: T\n---\n", ["B"])) === "---\ntags:\n  - A\n  - B\ntitle: T\n---\n");
check("adds when there is no tags key", apply("---\ntitle: T\n---\nBody", addTagsEdit("---\ntitle: T\n---\nBody", ["A", "B"])) === "---\ntitle: T\ntags:\n  - A\n  - B\n---\nBody");
check("adds to an empty tags key", same(tagsAfter("---\ntags:\ntitle: T\n---\n", ["A"]), ["A"]));
check("adds to an inline list", apply("---\ntags: [A, B]\n---\n", addTagsEdit("---\ntags: [A, B]\n---\n", ["C"])) === "---\ntags: [A, B, C]\n---\n");
check("adds to an empty inline list", same(tagsAfter("---\ntags: []\n---\n", ["A"]), ["A"]));
check("turns a single value into a list", same(tagsAfter("---\ntags: A\ntitle: T\n---\n", ["B"]), ["A", "B"]));
check("uses the indentation the file already uses", apply("---\nimages:\n - a.jpg\ntitle: T\n---\n", addTagsEdit("---\nimages:\n - a.jpg\ntitle: T\n---\n", ["A"])).includes("tags:\n - A\n"));
check("a tag already there is not added twice (any capitals)", addTagsEdit("---\ntags:\n  - research\n---\n", ["Research"]) === null && same(tagsAfter("---\ntags:\n  - research\n---\n", ["Research", "B"]), ["research", "B"]));
check("no front matter means no edit", addTagsEdit("Body only", ["A"]) === null);
check("a tag that needs quoting is quoted", same(tagsAfter("---\ntitle: T\n---\n", ["Q: and A"]), ["Q: and A"]));
const body = "---\ntags:\n  - A\n  - \"B C\"\n---\n";
const block = keyBlock(linesOf(body), frontMatterRange(linesOf(body)), "tags");
check("keyBlock reads items with their positions", block.items.length === 2 && block.items[1].text === "B C" && replaceTagEdit(block.items[1], "D").newText === "D" && apply(body, replaceTagEdit(block.items[1], "D")).includes("  - D\n"));

const ctx = (text, line, character) => completionContext(linesOf(text), { line, character });
const doc = "---\ntitle: T\ntags:\n  - Res\n  - \n\ncategory: Peo\n---\nBody Res";
check("a list item being typed", ctx(doc, 3, 7)?.partial === "Res" && ctx(doc, 3, 7).key === "tags" && ctx(doc, 3, 7).range.start.character === 4);
check("an empty list item", ctx(doc, 4, 4)?.partial === "" && ctx(doc, 4, 4).prefix === "");
check("a new line inside the tags", ctx("---\ntags:\n  - A\n  \n---\n", 3, 2)?.prefix === "- ");
check("the line after tags: with nothing yet", ctx("---\ntags:\n\n---\n", 2, 0)?.prefix === "- ");
check("inline list", ctx("---\ntags: [A, Re\n---\n", 1, 12)?.partial === "Re" && ctx("---\ntags: [A, Re\n---\n", 1, 12).range.start.character === 10);
check("tags: on the key line", ctx("---\ntags: Re\n---\n", 1, 10)?.partial === "Re");
check("category", ctx(doc, 6, 13)?.key === "category" && ctx(doc, 6, 13).partial === "Peo");
check("not in other keys, the body or outside", ctx(doc, 1, 5) === null && ctx(doc, 8, 3) === null && ctx("No front matter", 0, 3) === null);
check("not under a different key even after a list", ctx("---\nimages:\n  - a.jpg\n  - \n---\n", 3, 4) === null);

console.log(`${ok} of ${n} passed`);
process.exit(ok === n ? 0 : 1);
