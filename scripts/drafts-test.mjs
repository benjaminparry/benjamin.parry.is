import { isDraft, showDrafts, hidesDraft, addDrafts } from "../_config/drafts.js";
let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : (fail++, console.log("FAIL", name)); };
const live = { draft: true }, normal = { title: "x" };

check("draft: true is a draft", isDraft(live));
check('draft: "true" is a draft', isDraft({ draft: "true" }));
check("draft: false is not", !isDraft({ draft: false }));
check("no draft key is not", !isDraft(normal) && !isDraft(undefined));
check("a real build hides drafts", hidesDraft(live, { ELEVENTY_RUN_MODE: "build" }));
check("no run mode at all still hides them", hidesDraft(live, {}));
check("npm start (serve) shows them", !hidesDraft(live, { ELEVENTY_RUN_MODE: "serve" }));
check("--watch shows them", !hidesDraft(live, { ELEVENTY_RUN_MODE: "watch" }));
check("SHOW_DRAFTS shows them in a build", !hidesDraft(live, { ELEVENTY_RUN_MODE: "build", SHOW_DRAFTS: "1" }));
check("normal posts are never hidden", !hidesDraft(normal, { ELEVENTY_RUN_MODE: "build" }));
check("showDrafts reads the real environment by default", typeof showDrafts() === "boolean");

// wired into Eleventy the way the config does it
const calls = { pre: null, after: null };
const fake = { addPreprocessor: (name, ext, fn) => (calls.pre = { name, ext, fn }), on: (e, fn) => (calls.after = { e, fn }) };
addDrafts(fake);
check("registers a preprocessor for every file type", calls.pre.name === "drafts" && calls.pre.ext === "*");
process.env.ELEVENTY_RUN_MODE = "build"; delete process.env.SHOW_DRAFTS;
check("the preprocessor returns false for a draft in a build", calls.pre.fn({ draft: true, page: { inputPath: "./source/writing/x.md" } }) === false);
check("and nothing for a normal post", calls.pre.fn({ title: "y" }) === undefined);
const logged = []; const log = console.log; console.log = (m) => logged.push(m);
calls.after.fn(); console.log = log;
check("it says which drafts were left out", logged.length === 1 && logged[0].includes("source/writing/x.md"));
process.env.ELEVENTY_RUN_MODE = "serve";
check("in serve the preprocessor lets a draft through", calls.pre.fn({ draft: true }) === undefined);
check("after the build event it listens on is eleventy.after", calls.after.e === "eleventy.after");

console.log(`${pass} of ${pass + fail} passed`);
process.exit(fail ? 1 : 0);
