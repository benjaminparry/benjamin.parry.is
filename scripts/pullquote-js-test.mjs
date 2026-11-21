import { createRequire } from "node:module";
import { pullquote, addPullquote } from "../_config/pullquote.js";
const MarkdownIt = createRequire("/opt/npm-tools/x.js")("markdown-it");
let n = 0, ok = 0;
const check = (name, cond) => { n++; if (cond) ok++; else console.log("FAIL", name); };

const repeat = pullquote("A sentence <em>here</em>.");
check("repeat is a hidden div", repeat.startsWith('<div class="pullquote pullquote--repeat" aria-hidden="true">') && !repeat.includes("<aside"));
check("repeat duplicate false is visible", !pullquote("x", { duplicate: false }).includes("aria-hidden"));
const q = pullquote("Words.", "Ada", "https://example.com/?a=1&b=2");
check("quotation figure with cite and link", q.includes('<blockquote cite="https://example.com/?a=1&amp;b=2"><p>Words.</p></blockquote>') && q.includes('<figcaption><a href="https://example.com/?a=1&amp;b=2">Ada</a></figcaption>') && !q.includes("aria-hidden"));
check("name only has no cite and no link", (s => !s.includes("cite=") && s.includes("<figcaption>Grace</figcaption>"))(pullquote("x", "Grace")));
check("url only uses source then Source", pullquote("x", "", "https://e.com", { source: "Ex" }).includes(">Ex</a>") && pullquote("x", "", "https://e.com").includes(">Source</a>"));
check("keyword args work", pullquote("x", { by: "Ada", align: "right", __keywords: true }).includes("pullquote pullquote--right"));
check("options object works", pullquote("x", "Ada", undefined, { align: "center", class: "k" }).includes('class="pullquote pullquote--center k"'));
check("bad align is ignored", !pullquote("x", "Ada", undefined, { align: "evil\" onload=\"x" }).includes("evil"));
check("by is escaped", pullquote("x", 'A "B" <i>').includes("A &quot;B&quot; &lt;i&gt;"));
const multi = pullquote("First.\n\nSecond.\n\n\nThird.", "Ada");
check("blank lines become paragraphs", multi.includes("<blockquote><p>First.</p>\n<p>Second.</p>\n<p>Third.</p></blockquote>"));
check("own <p> tags are kept", pullquote("<p>A</p>\n<p>B</p>", "Ada").includes("<blockquote><p>A</p>\n<p>B</p></blockquote>"));
check("empty content outputs nothing", pullquote("  \n ", "Ada") === "");
for (const out of [repeat, q, multi]) check("no blank lines in output", !/\n\s*\n/.test(out));

const md = new MarkdownIt({ html: true });
const page = `Before.\n\n${multi}\n\nMiddle.\n\n${repeat}\n\nAfter.\n`;
const html = md.render(page);
check("markdown keeps figure and div intact", !html.includes("<pre") && !html.includes("&lt;figure") && !html.includes("<p><figure") && !html.includes("<p><div") && html.includes("<p>Second.</p>") && html.includes("<p>After.</p>"));

let reg = null;
addPullquote({ addPairedShortcode: (name, fn) => { reg = { name, fn }; } });
check("registers a paired shortcode named pullquote", reg && reg.name === "pullquote" && reg.fn === pullquote);
console.log(`${ok} of ${n} passed`);
process.exit(ok === n ? 0 : 1);
