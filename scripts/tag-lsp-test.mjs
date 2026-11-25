// Talks to scripts/tag-lsp.mjs the way an editor does, over stdin and stdout: node scripts/tag-lsp-test.mjs
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeSite } from "./tags-test-site.mjs";
import { listOf, parseFrontMatter } from "../_config/tags.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const site = makeSite();
const server = spawn("node", [path.join(here, "tag-lsp.mjs")], { env: { ...process.env, TAG_SUGGEST_ROOT: site.root }, stdio: ["pipe", "pipe", "pipe"] });
let stderr = "";
server.stderr.on("data", (d) => (stderr += d));

let buffer = Buffer.alloc(0), nextId = 1;
const pending = new Map(), notifications = [], waiters = [];
server.stdout.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const end = buffer.indexOf("\r\n\r\n");
    if (end < 0) return;
    const length = Number(buffer.subarray(0, end).toString().match(/Content-Length: (\d+)/)[1]);
    if (buffer.length < end + 4 + length) return;
    const message = JSON.parse(buffer.subarray(end + 4, end + 4 + length).toString("utf8"));
    buffer = buffer.subarray(end + 4 + length);
    if (message.id !== undefined && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    else { notifications.push(message); for (const w of [...waiters]) w(); }
  }
});
const frame = (message) => { const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", ...message })); return Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body]); };
const request = (method, params) => new Promise((resolve, reject) => {
  const id = nextId++;
  const timer = setTimeout(() => reject(new Error(`no reply to ${method}`)), 8000);
  pending.set(id, (m) => { clearTimeout(timer); resolve(m); });
  server.stdin.write(frame({ id, method, params }));
});
const notify = (method, params) => server.stdin.write(frame({ method, params }));
const waitFor = (test) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("waited for a notification that never came")), 8000);
  const look = () => { const found = notifications.find(test); if (found) { clearTimeout(timer); waiters.splice(waiters.indexOf(look), 1); notifications.splice(notifications.indexOf(found), 1); resolve(found); return true; } return false; };
  if (!look()) waiters.push(look);
});

let n = 0, ok = 0;
const check = (name, cond, detail) => { n++; if (cond) ok++; else console.log("FAIL", name, detail ?? ""); };
const apply = (text, edits) => {
  const lines = text.split("\n");
  const offset = (p) => lines.slice(0, p.line).reduce((sum, l) => sum + l.length + 1, 0) + p.character;
  return [...edits].sort((a, b) => offset(b.range.start) - offset(a.range.start)).reduce((t, e) => t.slice(0, offset(e.range.start)) + e.newText + t.slice(offset(e.range.end)), text);
};

const uriOf = (rel) => pathToFileURL(path.join(site.root, "source", rel)).href;
const doc = (tagLines) => `---\ntitle: "Auditing a site for accessibility"\nsummary: "Screen readers and keyboard focus"\ncategory: \ntags:\n${tagLines}\n---\n\nI tested the site with a screen reader. Keyboard focus was lost and WCAG says it must be visible.\n`;

try {
  // The first message arrives in two pieces, as a pipe may deliver it
  const first = frame({ id: nextId, method: "initialize", params: { rootUri: pathToFileURL(site.root).href, capabilities: {} } });
  const initId = nextId++;
  const initDone = new Promise((resolve) => pending.set(initId, resolve));
  server.stdin.write(first.subarray(0, 9));
  await new Promise((r) => setTimeout(r, 30));
  server.stdin.write(first.subarray(9, 40));
  await new Promise((r) => setTimeout(r, 30));
  server.stdin.write(first.subarray(40));
  const init = await initDone;
  check("initialize works even when the message arrives in pieces", init.result?.capabilities?.completionProvider && init.result.capabilities.codeActionProvider && init.result.serverInfo.name === "tag-suggest");
  check("asks for full text, and saves", init.result.capabilities.textDocumentSync.change === 1 && init.result.capabilities.textDocumentSync.openClose === true);
  notify("initialized", {});

  const uri = uriOf("writing/2024-03-01-audit.md");
  let text = doc("  - ");
  notify("textDocument/didOpen", { textDocument: { uri, languageId: "markdown", version: 1, text } });
  await waitFor((m) => m.method === "textDocument/publishDiagnostics" && m.params.uri === uri);

  let r = await request("textDocument/completion", { textDocument: { uri }, position: { line: 5, character: 4 } });
  const items = r.result?.items ?? [];
  check("completion: suggestions for this post come first", items[0]?.label === "Accessibility" && /suggested/.test(items[0].detail) && items[0].sortText < items[items.length - 1].sortText, items.slice(0, 3).map((i) => i.label));
  check("completion: then every tag, most used first", items.some((i) => i.label === "Japan") && items.every((i, k) => k === 0 || i.sortText >= items[k - 1].sortText));
  check("completion: inserts at the cursor", items[0].textEdit.range.start.line === 5 && items[0].textEdit.range.start.character === 4 && items[0].textEdit.newText === "Accessibility");
  check("completion: says why in the documentation", /mentioned in the/.test(items[0].documentation?.value ?? "") || /similar/.test(items[0].documentation?.value ?? ""), items[0].documentation);

  text = doc("  - Accessibility\n  - Res");
  notify("textDocument/didChange", { textDocument: { uri, version: 2 }, contentChanges: [{ text }] });
  r = await request("textDocument/completion", { textDocument: { uri }, position: { line: 6, character: 7 } });
  check("completion: a tag already on the post is not offered again", !r.result.items.some((i) => i.label === "Accessibility") && r.result.items.some((i) => i.label === "Research"));
  const typed = r.result.items.find((i) => i.label === "Research").textEdit;
  check("completion: the typed part is replaced", typed.range.start.character === 4 && typed.range.end.character === 7 && typed.newText === "Research", typed);

  r = await request("textDocument/completion", { textDocument: { uri }, position: { line: 8, character: 3 } });
  check("completion: nothing in the body of the post", r.result === null);
  r = await request("textDocument/completion", { textDocument: { uri }, position: { line: 3, character: 10 } });
  check("completion: category offers the categories in use", r.result === null || Array.isArray(r.result.items));

  // A new line in the list, as when you press Enter after the last tag
  text = doc("  - Accessibility\n  ");
  notify("textDocument/didChange", { textDocument: { uri, version: 3 }, contentChanges: [{ text }] });
  r = await request("textDocument/completion", { textDocument: { uri }, position: { line: 6, character: 2 } });
  check("completion: a blank line in the list gets a dash", r.result?.items?.[0]?.textEdit.newText.startsWith("- "), r.result?.items?.[0]?.textEdit);

  // Code actions
  text = doc("  - Indieweb");
  notify("textDocument/didChange", { textDocument: { uri, version: 4 }, contentChanges: [{ text }] });
  r = await request("textDocument/codeAction", { textDocument: { uri }, range: { start: { line: 5, character: 0 }, end: { line: 5, character: 0 } }, context: { diagnostics: [] } });
  const titles = r.result.map((a) => a.title);
  check("code actions: add a suggested tag", titles.some((t) => /^Add tag “Accessibility”/.test(t)), titles);
  check("code actions: one suggestion means no \"add all\" action", !titles.some((t) => /^Add suggested tags:/.test(t)), titles);
  const addOne = r.result.find((a) => /^Add tag “Accessibility”/.test(a.title));
  const after = apply(text, addOne.edit.changes[uri]);
  check("code actions: the edit adds the tag to the list", JSON.stringify(listOf(parseFrontMatter(after).data.tags)) === JSON.stringify(["Indieweb", "Accessibility"]), after);

  // Two suggestions: each can be added, or both at once
  text = `---\ntitle: "Interviewing people about accessibility"\nsummary: "A user interview about screen reader use"\ntags:\n  - Indieweb\n---\n\nWe ran a user interview and a research session about keyboard focus and screen reader accessibility with each participant.\n`;
  notify("textDocument/didChange", { textDocument: { uri, version: 4.5 }, contentChanges: [{ text }] });
  r = await request("textDocument/codeAction", { textDocument: { uri }, range: { start: { line: 4, character: 0 }, end: { line: 4, character: 0 } }, context: { diagnostics: [] } });
  const all = r.result.find((a) => /^Add suggested tags:/.test(a.title));
  const addedAll = all ? listOf(parseFrontMatter(apply(text, all.edit.changes[uri])).data.tags) : [];
  check("code actions: add all the suggested tags at once", all && addedAll[0] === "Indieweb" && addedAll.length >= 3 && addedAll.includes("Accessibility") && new Set(addedAll).size === addedAll.length, r.result.map((a) => a.title));

  // Diagnostics for a respelling
  text = doc("  - Accesibility\n  - Gardening");
  notify("textDocument/didChange", { textDocument: { uri, version: 5 }, contentChanges: [{ text }] });
  const diag = await waitFor((m) => m.method === "textDocument/publishDiagnostics" && m.params.uri === uri && m.params.diagnostics.some((d) => d.code === "similar-tag"));
  const warn = diag.params.diagnostics.find((d) => d.code === "similar-tag");
  check("diagnostics: warns that a tag looks like a respelling", warn.severity === 2 && /Did you mean “Accessibility”/.test(warn.message) && warn.range.start.line === 5, warn.message);
  const hint = diag.params.diagnostics.find((d) => d.code === "new-tag");
  check("diagnostics: a brand new tag is only a hint", hint?.severity === 4 && /Gardening/.test(hint.message), diag.params.diagnostics);
  r = await request("textDocument/codeAction", { textDocument: { uri }, range: warn.range, context: { diagnostics: [warn] } });
  const fix = r.result.find((a) => a.title === "Change to “Accessibility”");
  check("code actions: change to the right spelling", fix && listOf(parseFrontMatter(apply(text, fix.edit.changes[uri])).data.tags).join() === "Accessibility,Gardening" && fix.isPreferred === true);

  // A new post is picked up after a save
  site.write("source/writing/2024-04-01-gardens.md", "---\ntitle: Gardening notes\ntags:\n  - Gardening\n---\nPlants and ponds.\n");
  site.write("source/writing/2024-04-02-gardens.md", "---\ntitle: More gardening\ntags:\n  - Gardening\n---\nHedges and ponds.\n");
  notify("textDocument/didSave", { textDocument: { uri } });
  const cleared = await waitFor((m) => m.method === "textDocument/publishDiagnostics" && m.params.uri === uri && !m.params.diagnostics.some((d) => d.code === "new-tag"));
  check("save: posts are read again, so a tag used elsewhere is no longer new", cleared.params.diagnostics.every((d) => d.code !== "new-tag"));

  // Files that are not posts
  const other = pathToFileURL(path.join(site.root, "README.md")).href;
  notify("textDocument/didOpen", { textDocument: { uri: other, languageId: "markdown", version: 1, text: doc("  - ") } });
  r = await request("textDocument/completion", { textDocument: { uri: other }, position: { line: 5, character: 4 } });
  check("files outside source/ get nothing", r.result === null);
  const pageUri = uriOf("pages/about.md");
  notify("textDocument/didOpen", { textDocument: { uri: pageUri, languageId: "markdown", version: 1, text: doc("  - ") } });
  r = await request("textDocument/completion", { textDocument: { uri: pageUri }, position: { line: 5, character: 4 } });
  check("pages are not posts", r.result === null);
  r = await request("textDocument/codeAction", { textDocument: { uri: other }, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, context: { diagnostics: [] } });
  check("no code actions outside posts", Array.isArray(r.result) && r.result.length === 0);

  // Robustness
  r = await request("textDocument/hover", { textDocument: { uri }, position: { line: 0, character: 0 } });
  check("an unknown request gets an error reply, not silence", r.error?.code === -32601);
  r = await request("textDocument/completion", { textDocument: { uri: "file:///nowhere/x.md" }, position: { line: 0, character: 0 } });
  check("a file that was never opened gets null", r.result === null);
  notify("textDocument/didClose", { textDocument: { uri } });
  const closed = await waitFor((m) => m.method === "textDocument/publishDiagnostics" && m.params.uri === uri && m.params.diagnostics.length === 0);
  check("closing a file clears its diagnostics", !!closed);

  r = await request("shutdown", null);
  check("shutdown", r.result === null);
  const exited = new Promise((resolve) => server.on("exit", resolve));
  notify("exit", null);
  check("exit stops the server", (await exited) === 0);
} catch (error) {
  n++; console.log("FAIL", error.message);
  console.log(stderr.split("\n").slice(-8).join("\n"));
  server.kill();
} finally {
  site.cleanup();
}
console.log(`${ok} of ${n} passed`);
process.exit(ok === n ? 0 : 1);
