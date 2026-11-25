// A language server that suggests tags while you write a post. Zed starts it (see tools/zed-tag-suggest/);
// any editor that speaks the Language Server Protocol can use it:  node scripts/tag-lsp.mjs
//
// In a post's front matter it offers:
//   - completions for the lines under  tags:  (suggestions for this post first, then every tag you use)
//   - completions for  category:
//   - a warning on a tag nothing else uses when it looks like a respelling ("Quantitive" -> "Quantitative")
//   - code actions: "Add tag" for each suggestion, "Add suggested tags", and "Change to ..." for the warning
//
// It reads the other posts in source/ for what to suggest, and never changes a file itself: the editor applies the edits.
// Messages go over stdin/stdout, so anything for a person to read goes to stderr (Zed shows it in the language server log).

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadIndex } from "../_config/tags-files.js";
import { makePost, suggestFor, explain, closestTags, isPostPath } from "../_config/tags.js";
import { slugify } from "../_config/writing.js";
import { completionContext, addTagsEdit, replaceTagEdit, frontMatterRange, keyBlock, linesOf, yamlScalar } from "../_config/tags-editor.js";

// The site is the folder this script is in (TAG_SUGGEST_ROOT points it elsewhere, which the tests use)
const root = process.env.TAG_SUGGEST_ROOT ? path.resolve(process.env.TAG_SUGGEST_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "source";
const SOURCE_NAME = "tag-suggest";
const log = (...args) => console.error("[tag-suggest]", ...args);

// ---- The index of your posts, rebuilt after a save ----------------------------------------------------------------
let index = null;
let stale = true;
function getIndex() {
  if (!index || stale) {
    const started = Date.now();
    index = loadIndex(root, SOURCE);
    stale = false;
    log(`read ${index.posts.length} posts and ${index.tags.size} tags in ${Date.now() - started} ms`);
  }
  return index;
}

// ---- Open files ---------------------------------------------------------------------------------------------------
const open = new Map();   // uri -> text

function relOf(uri) {
  if (!uri.startsWith("file://")) return null;
  const file = fileURLToPath(uri);
  const rel = path.relative(path.join(root, SOURCE), file).split(path.sep).join("/");
  return rel.startsWith("..") || path.isAbsolute(rel) || !isPostPath(rel) ? null : rel;
}

// What to suggest for the text in the editor, leaving out the tags it already has
function suggestionsFor(rel, text, { min = "low", limit = 12 } = {}) {
  const idx = getIndex();
  const post = makePost({ rel, text });
  return { post, found: suggestFor(idx, { rel, fields: post.fields, section: post.section, fresh: true }, { known: [...post.tagKeys], min, limit }) };
}

// ---- Completion ---------------------------------------------------------------------------------------------------
function complete(uri, position) {
  const rel = relOf(uri);
  const text = open.get(uri);
  if (!rel || text == null) return null;
  const lines = linesOf(text);
  const context = completionContext(lines, position);
  if (!context) return null;
  const idx = getIndex();
  const fm = frontMatterRange(lines);

  const insert = (name) => {
    if (context.prefix) {
      const block = keyBlock(lines, fm, context.key);
      const indent = context.indent ? "" : (block?.items.find((i) => i.indent !== undefined)?.indent ?? "  ");
      return `${indent}${context.prefix}${yamlScalar(name)}`;
    }
    return yamlScalar(name);
  };
  const item = (name, sort, detail, documentation) => ({
    label: name,
    kind: 12,
    detail,
    documentation: documentation ? { kind: "markdown", value: documentation } : undefined,
    sortText: sort,
    filterText: name,
    textEdit: { range: context.range, newText: insert(name) },
  });

  if (context.key === "category") {
    const counts = new Map();
    for (const post of idx.posts) if (post.category) counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    return { isIncomplete: false, items: [...counts].sort((a, b) => b[1] - a[1]).map(([name, n], i) => item(name, `0${String(i).padStart(3, "0")}`, `category · ${n} posts`)) };
  }

  // The tags already written, not counting the one being typed
  const block = keyBlock(lines, fm, "tags");
  const already = (block?.items ?? []).filter((i) => !(i.line === position.line && i.end >= context.range.start.character)).map((i) => i.text);
  const { found } = suggestionsFor(rel, text, { min: "low" });
  const items = [];
  const used = new Set(already.map(slugify));
  found.forEach((s, i) => {
    used.add(s.key);
    items.push(item(s.name, `0${String(i).padStart(2, "0")}`, `suggested · ${s.level} · ${s.uses} posts`, `**${s.name}** is on ${s.uses} other posts.\n\n${explain(s)}`));
  });
  const own = idx.byRel.get(rel)?.post.tagKeys;
  for (const tag of [...idx.tags.values()].sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name))) {
    if (used.has(tag.key)) continue;
    const posts = tag.uses - (own?.has(tag.key) ? 1 : 0);
    items.push(item(tag.name, `1${String(9999 - tag.uses).padStart(4, "0")}${tag.name}`, `${posts} ${posts === 1 ? "post" : "posts"}`));
  }
  return { isIncomplete: false, items };
}

// ---- Diagnostics --------------------------------------------------------------------------------------------------
function diagnosticsFor(uri) {
  const rel = relOf(uri);
  const text = open.get(uri);
  if (!rel || text == null) return [];
  const lines = linesOf(text);
  const fm = frontMatterRange(lines);
  const block = fm && keyBlock(lines, fm, "tags");
  if (!block) return [];
  const idx = getIndex();
  const own = idx.byRel.get(rel)?.post.tagKeys;
  const out = [];
  for (const entry of block.items) {
    const key = slugify(entry.text);
    if (!key) continue;
    const elsewhere = (idx.tags.get(key)?.uses ?? 0) - (own?.has(key) ? 1 : 0);
    if (elsewhere > 0) continue;
    const near = closestTags(idx, entry.text);
    const range = { start: { line: entry.line, character: entry.start }, end: { line: entry.line, character: entry.end } };
    if (near.length) {
      out.push({
        range, severity: 2, source: SOURCE_NAME, code: "similar-tag",
        message: `No other post uses “${entry.text}”. Did you mean ${near.map((n) => `“${n.tag.name}” (${n.tag.uses})`).join(" or ")}? (${near[0].why})`,
        data: { replacements: near.map((n) => n.tag.name), line: entry.line, start: entry.start, end: entry.end },
      });
    } else {
      out.push({ range, severity: 4, source: SOURCE_NAME, code: "new-tag", message: `New tag: no other post uses “${entry.text}” yet.` });
    }
  }
  return out;
}

// ---- Code actions -------------------------------------------------------------------------------------------------
function codeActions(uri, context) {
  const rel = relOf(uri);
  const text = open.get(uri);
  if (!rel || text == null) return [];
  const actions = [];
  const edit = (changes) => ({ changes: { [uri]: changes } });

  for (const d of context?.diagnostics ?? []) {
    if (d.source !== SOURCE_NAME || !d.data?.replacements) continue;
    for (const name of d.data.replacements) {
      actions.push({ title: `Change to “${name}”`, kind: "quickfix", diagnostics: [d], isPreferred: name === d.data.replacements[0], edit: edit([replaceTagEdit({ line: d.data.line, start: d.data.start, end: d.data.end }, name)]) });
    }
  }

  const { found } = suggestionsFor(rel, text, { min: "medium", limit: 5 });
  for (const s of found) {
    const change = addTagsEdit(text, [s.name]);
    if (change) actions.push({ title: `Add tag “${s.name}” (${s.uses} posts)`, kind: "quickfix", edit: edit([change]) });
  }
  if (found.length > 1) {
    const change = addTagsEdit(text, found.map((s) => s.name));
    if (change) actions.push({ title: `Add suggested tags: ${found.map((s) => s.name).join(", ")}`, kind: "quickfix", edit: edit([change]) });
  }
  return actions;
}

// ---- Messages -----------------------------------------------------------------------------------------------------
function send(message) {
  const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", ...message }), "utf8");
  process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
  process.stdout.write(body);
}
const reply = (id, result) => send({ id, result });
const fail = (id, code, message) => send({ id, error: { code, message } });

const timers = new Map();
function publishLater(uri, wait = 300) {
  clearTimeout(timers.get(uri));
  timers.set(uri, setTimeout(() => {
    if (!open.has(uri)) return;
    try { send({ method: "textDocument/publishDiagnostics", params: { uri, diagnostics: diagnosticsFor(uri) } }); }
    catch (error) { log("diagnostics failed:", error.stack ?? error.message); }
  }, wait));
}

export function handle(message) {
  const { id, method, params } = message;
  const wantsReply = id !== undefined;
  try {
    switch (method) {
      case "initialize":
        return reply(id, {
          capabilities: {
            textDocumentSync: { openClose: true, change: 1, save: { includeText: false } },
            completionProvider: { triggerCharacters: ["-", " ", ","], resolveProvider: false },
            codeActionProvider: { codeActionKinds: ["quickfix"] },
          },
          serverInfo: { name: "tag-suggest", version: "0.1.0" },
        });
      case "initialized":
        setTimeout(() => { try { getIndex(); } catch (error) { log("could not read the posts:", error.message); } }, 0);
        return;
      case "shutdown": return reply(id, null);
      case "exit": process.exit(0); return;
      case "textDocument/didOpen":
        open.set(params.textDocument.uri, params.textDocument.text);
        return publishLater(params.textDocument.uri, 50);
      case "textDocument/didChange":
        open.set(params.textDocument.uri, params.contentChanges.at(-1).text);
        return publishLater(params.textDocument.uri);
      case "textDocument/didSave":
        stale = true;                          // the posts changed: read them again next time
        return publishLater(params.textDocument.uri, 50);
      case "textDocument/didClose":
        open.delete(params.textDocument.uri);
        return send({ method: "textDocument/publishDiagnostics", params: { uri: params.textDocument.uri, diagnostics: [] } });
      case "textDocument/completion": return reply(id, complete(params.textDocument.uri, params.position));
      case "textDocument/codeAction": return reply(id, codeActions(params.textDocument.uri, params.context));
      default:
        if (wantsReply) fail(id, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    log(`${method} failed:`, error.stack ?? error.message);
    if (wantsReply) fail(id, -32603, error.message);
  }
}

// Read messages: "Content-Length: N", a blank line, then N bytes of JSON
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let buffer = Buffer.alloc(0);
  process.stdin.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) return;
      const length = Number(buffer.subarray(0, headerEnd).toString("ascii").match(/Content-Length:\s*(\d+)/i)?.[1]);
      if (!length) { log("a message had no Content-Length; ignoring it"); buffer = buffer.subarray(headerEnd + 4); continue; }
      if (buffer.length < headerEnd + 4 + length) return;
      const body = buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString("utf8");
      buffer = buffer.subarray(headerEnd + 4 + length);
      try { handle(JSON.parse(body)); } catch (error) { log("could not read a message:", error.message); }
    }
  });
  process.stdin.on("end", () => process.exit(0));
  log(`started for ${root}`);
}
