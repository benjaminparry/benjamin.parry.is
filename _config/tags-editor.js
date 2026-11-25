// The editing side of tag suggestions: where the tags are in a post's front matter, what is being typed there,
// and the edit that adds tags. Plain functions on text, no files and no editor, so they are easy to test.
// Positions are { line, character }, counted from 0, as the Language Server Protocol does.

// Quote a tag name when YAML would misread it: "C#", "Yes", "Q&A: part 1"
export function yamlScalar(name) {
  const text = String(name).trim();
  const risky = /^[\s\-?:,\[\]{}#&*!|>'"%@`]|:\s|\s#|:$|\s$/.test(text) || /^(true|false|null|yes|no|on|off|~)$/i.test(text);
  return risky ? JSON.stringify(text) : text;
}

const unquote = (s) => {
  const t = s.trim();
  if (t.length >= 2 && ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))) return t.slice(1, -1);
  return t;
};

export const linesOf = (text) => String(text).replace(/^﻿/, "").split(/\r?\n/);

// The front matter: lines 0 .. end, where line 0 and line `end` are the "---" lines. Null if there is none.
export function frontMatterRange(lines) {
  if (lines[0]?.trim() !== "---") return null;
  for (let i = 1; i < lines.length; i++) if (lines[i].trim() === "---") return { start: 0, end: i };
  return null;
}

const KEY = /^([A-Za-z_][\w.-]*):(.*)$/;

// Where a key's lines are: { keyLine, lastLine, value, items: [{ line, text, start, end }] }
export function keyBlock(lines, fm, key) {
  let keyLine = -1;
  for (let i = fm.start + 1; i < fm.end; i++) {
    const m = lines[i].match(KEY);
    if (m && m[1] === key) { keyLine = i; break; }
  }
  if (keyLine < 0) return null;
  let lastLine = keyLine;
  const items = [];
  for (let i = keyLine + 1; i < fm.end; i++) {
    if (KEY.test(lines[i])) break;
    if (lines[i].trim() !== "") lastLine = i;
    const m = lines[i].match(/^(\s*)-\s+(.*?)\s*$/);
    if (m) {
      const raw = m[2];
      const text = unquote(raw.replace(/\s+#.*$/, ""));
      const start = lines[i].indexOf(raw, m[1].length + 1);
      items.push({ line: i, text, start, end: start + raw.length, indent: m[1] });
    }
  }
  const value = lines[keyLine].match(KEY)[2].trim();
  // an inline list: tags: [A, B]
  if (value.startsWith("[")) {
    const open = lines[keyLine].indexOf("[");
    const close = lines[keyLine].lastIndexOf("]");
    const inner = lines[keyLine].slice(open + 1, close < 0 ? undefined : close);
    let at = open + 1;
    for (const part of inner.split(",")) {
      const raw = part.trim();
      if (raw) items.push({ line: keyLine, text: unquote(raw), start: at + part.indexOf(raw), end: at + part.indexOf(raw) + raw.length, inline: true });
      at += part.length + 1;
    }
  } else if (value && !value.startsWith("#") && !items.length) {
    const start = lines[keyLine].indexOf(value, key.length + 1);
    items.push({ line: keyLine, text: unquote(value), start, end: start + value.length, scalar: true });
  }
  return { keyLine, lastLine, value, items, inline: value.startsWith("[") };
}

// What is being typed? { key, partial, range, prefix } or null when the cursor is not in the tags or category.
// prefix is what to put before the tag when starting a new list item ("- ").
export function completionContext(lines, pos) {
  const fm = frontMatterRange(lines);
  if (!fm || pos.line <= fm.start || pos.line >= fm.end) return null;
  let keyLine = -1, key = null;
  for (let i = pos.line; i > fm.start; i--) {
    const m = lines[i].match(KEY);
    if (m) { keyLine = i; key = m[1]; break; }
  }
  if (key !== "tags" && key !== "category") return null;
  const line = lines[pos.line];
  const before = line.slice(0, pos.character);
  const at = (start, prefix = "") => ({ key, partial: before.slice(start), range: { start: { line: pos.line, character: start }, end: pos } , prefix });

  if (pos.line === keyLine) {
    const m = before.match(new RegExp(`^${key}:\\s*(.*)$`));
    if (!m) return null;
    const afterColon = before.length - m[1].length;
    if (key === "tags" && m[1].startsWith("[")) {
      const cut = Math.max(m[1].lastIndexOf(","), m[1].lastIndexOf("["));
      const start = afterColon + cut + 1;
      const leading = before.slice(start).match(/^\s*/)[0].length;
      return at(start + leading);
    }
    return at(afterColon);
  }
  if (key === "category") return null;
  const item = before.match(/^(\s*)-(\s*)(.*)$/);
  if (item) return at(before.length - item[3].length);
  if (before.trim() === "") return { ...at(pos.character, "- "), indent: before };
  return null;
}

// The indentation the other lists in this front matter use, "  " if there is none
function listIndent(lines, fm) {
  for (let i = fm.start + 1; i < fm.end; i++) {
    const m = lines[i].match(/^(\s*)-\s+\S/);
    if (m) return m[1];
  }
  return "  ";
}

// The edit that adds tags to a post. Returns { range, newText } to apply, or null if there is nothing to add or no front matter.
export function addTagsEdit(text, names) {
  const lines = linesOf(text);
  const fm = frontMatterRange(lines);
  if (!fm || !names.length) return null;
  const block = keyBlock(lines, fm, "tags");
  const have = new Set((block?.items ?? []).map((i) => i.text.toLowerCase()));
  const add = names.filter((n) => !have.has(n.toLowerCase()));
  if (!add.length) return null;
  const scalars = add.map(yamlScalar);
  const pos = (line, character) => ({ line, character });
  const eol = (line) => lines[line].length;

  if (!block) {
    const indent = listIndent(lines, fm);
    return { range: { start: pos(fm.end, 0), end: pos(fm.end, 0) }, newText: `tags:\n${scalars.map((s) => `${indent}- ${s}\n`).join("")}` };
  }
  if (block.inline) {
    const close = lines[block.keyLine].lastIndexOf("]");
    if (close < 0) return null;
    const empty = block.items.length === 0;
    return { range: { start: pos(block.keyLine, close), end: pos(block.keyLine, close) }, newText: `${empty ? "" : ", "}${scalars.join(", ")}` };
  }
  if (block.items.length && block.items[0].scalar) {
    const only = block.items[0];
    const indent = listIndent(lines, fm);
    return { range: { start: pos(only.line, 0), end: pos(only.line, eol(only.line)) }, newText: `tags:\n${[yamlScalar(only.text), ...scalars].map((s) => `${indent}- ${s}`).join("\n")}` };
  }
  const last = block.items.at(-1);
  const indent = last ? last.indent : listIndent(lines, fm);
  const after = last ? last.line : block.keyLine;
  return { range: { start: pos(after, eol(after)), end: pos(after, eol(after)) }, newText: scalars.map((s) => `\n${indent}- ${s}`).join("") };
}

// The edit that replaces one tag item with another (for "did you mean ...")
export function replaceTagEdit(item, name) {
  return { range: { start: { line: item.line, character: item.start }, end: { line: item.line, character: item.end } }, newText: yamlScalar(name) };
}
