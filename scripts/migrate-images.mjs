// Moves old image front matter to the new  pictures:  block. (Not  media:  - that already means film, book and so on.)
//
//   node scripts/migrate-images.mjs                  shows what would change, writes nothing
//   node scripts/migrate-images.mjs --write          edits the files
//   node scripts/migrate-images.mjs source/writing   only look in one folder (default: source)
//   --gallery   also add  gallery: true  to posts that have supporting images
//   --body      also turn Markdown pictures in the text into supporting images (see below)
//
// Front matter:
//   images:                                pictures:
//     - "/a.jpg"                             feed:
//     - "/b.jpg"                               src: "/a.jpg"
//                                            images:
//                                              - id: b
//                                                src: "/b.jpg"
//                                                # alt: describe this image
// The first image becomes the feed image, which is all the old templates ever showed. Any others become
// supporting images. An empty  images:  line is removed. A nested  images:  (like on the home page) is left alone.
//
// --body: a line that is only a Markdown picture, such as
//     ![A tree-lined road](/assets/images/road.jpg "The road home")
//   becomes  {% figure "road" %}  and the picture moves to pictures.images with its alt text and its "title" as the caption.
//   A picture with no alt text gets an "# alt:" reminder (the build warns until you fill it in).
//   Pictures in the middle of a sentence, several on one line, and raw <img> tags are left alone and listed.
//
// There is no alt text to move from the old  images:  lists (there never was), so those get the same "# alt:" reminder.
// Only front matter and picture lines change. Posts that already have a pictures: block are skipped, so running it twice is safe.
// A post whose text prints the old list (for example  <img src="{{ images }}">) is skipped and listed, for you to change by hand.
// Run it, then check  git diff.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";

const unquote = (text) => text.trim().replace(/\s+#.*$/, "").replace(/^(["'])(.*)\1$/, "$2");
const slug = (path) => basename(path.split(/[?#]/)[0], extname(path.split(/[?#]/)[0])).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image";
const quote = (s) => JSON.stringify(s);          // a JSON string is a valid YAML string

export function migrate(text, { gallery = false, body = false } = {}) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== "---") return { skip: "no front matter" };
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  if (end < 0) return { skip: "front matter is not closed" };
  const front = lines.slice(1, end);
  if (front.some((l) => /^pictures\s*:/.test(l))) return { skip: "already has pictures:" };

  // A post that prints the old list itself, like  <img src="{{ images }}">, would lose its picture. Leave it for you.
  if (lines.slice(end + 1).some((l) => /\{\{[^}]*\bimages\b|\{%[^%]*\bimages\b/.test(l))) return { skip: "the text uses {{ images }}, change it by hand" };

  // ---- the old images: list ----
  const at = front.findIndex((l) => /^images\s*:/.test(l));
  let paths = [], last = at, removeEmpty = false;
  if (at >= 0) {
    const inline = front[at].replace(/^images\s*:\s*/, "").trim();
    if (inline.startsWith("[")) {
      paths = inline.replace(/^\[|\]\s*$/g, "").split(",").map(unquote).filter(Boolean);
    } else if (inline && !inline.startsWith("#")) {
      return { skip: `images: is written in a way I don't understand (${inline})` };
    } else {
      for (let i = at + 1; i < front.length; i++) {
        const item = front[i].match(/^\s*-\s+(.*)$/);
        if (item) { paths.push(unquote(item[1])); last = i; }
        else if (front[i].trim() === "" || front[i].trim().startsWith("#")) continue;
        else break;
      }
    }
    if (paths.some((p) => !p || (p.includes(":") && !/^https?:/.test(p)) || /^[\[{]/.test(p))) return { skip: "images: has entries that aren't plain paths" };
    if (!paths.length) {
      const next = front.slice(last + 1).find((l) => l.trim() !== "");
      if (next !== undefined && /^\s+\S/.test(next) && last === at) return { skip: "images: is a nested block, not a list" };
      removeEmpty = true;
    }
  }

  // ---- the pictures ----
  const feed = paths[0];
  const images = [];                                   // { id, src, alt, caption }
  const take = (src, extra = {}) => {
    let found = images.find((i) => i.src === src);
    if (!found) {
      let id = slug(src), n = 1;
      while (images.some((i) => i.id === id)) id = `${slug(src)}-${++n}`;
      found = { id, src };
      images.push(found);
    }
    Object.assign(found, Object.fromEntries(Object.entries(extra).filter(([, v]) => v)));
    return found;
  };
  for (const p of paths.slice(1)) take(p);

  // ---- the text: lines that are only a Markdown picture ----
  let bodyLines = lines.slice(end + 1), converted = 0;
  const left = [];
  if (body) {
    const out = [];
    let fence = null;
    for (let i = 0; i < bodyLines.length; i++) {
      const line = bodyLines[i];
      const f = line.match(/^\s*(```|~~~)/);
      if (f) fence = fence === f[1] ? null : fence ?? f[1];
      const m = !fence && line.match(/^\s*!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)\s*$/);
      if (m) {
        const item = take(m[2], { alt: m[1].trim(), caption: m[3] });
        if (out.length && out[out.length - 1].trim() !== "") out.push("");    // a shortcode needs blank lines around it
        out.push(`{% figure "${item.id}" %}`);
        if (i + 1 < bodyLines.length && bodyLines[i + 1].trim() !== "") out.push("");
        converted++;
      } else {
        if (!fence && (/!\[[^\]]*\]\([^)]*\)/.test(line) || /<img\b/i.test(line))) left.push(line.trim().slice(0, 90));
        out.push(line);
      }
    }
    bodyLines = out;
  }

  if (!feed && !images.length) {
    if (!removeEmpty) return { skip: "no images", left };
    return { text: [lines[0], ...front.slice(0, at), ...front.slice(last + 1), ...lines.slice(end, end + 1), ...bodyLines].join(eol), count: 0, converted: 0, left };
  }

  const block = ["pictures:"];
  if (feed) block.push("  feed:", `    src: ${quote(feed)}`);
  if (images.length) {
    block.push("  images:");
    for (const i of images) {
      block.push(`    - id: ${i.id}`, `      src: ${quote(i.src)}`);
      block.push(i.alt ? `      alt: ${quote(i.alt)}` : "      # alt: describe this image");
      if (i.caption) block.push(`      caption: ${quote(i.caption)}`);
    }
    if (gallery) block.push("  gallery: true");
  }
  const keep = at >= 0 ? [...front.slice(0, at), ...block, ...front.slice(last + 1)] : [...front, ...block];
  return { text: [lines[0], ...keep, lines[end], ...bodyLines].join(eol), count: (feed ? 1 : 0) + images.length, converted, left };
}

function* markdownFiles(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* markdownFiles(path);
    else if (name.endsWith(".md")) yield path;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const write = args.includes("--write"), gallery = args.includes("--gallery"), body = args.includes("--body");
  const roots = args.filter((a) => !a.startsWith("--"));
  if (!roots.length) roots.push("source");
  let changed = 0, bodyCount = 0;
  const skipped = {}, leftOver = [];
  for (const root of roots) {
    for (const file of markdownFiles(root)) {
      const before = readFileSync(file, "utf8");
      const result = migrate(before, { gallery, body });
      if (result.left?.length) leftOver.push(...result.left.map((l) => `${file}: ${l}`));
      if (result.skip) { if (result.skip !== "no images") (skipped[result.skip] ??= []).push(file); continue; }
      changed++; bodyCount += result.converted ?? 0;
      const what = [result.count ? `${result.count} picture${result.count === 1 ? "" : "s"}` : "removed an empty images:", result.converted ? `${result.converted} in the text` : ""].filter(Boolean).join(", ");
      console.log(`${write ? "changed" : "would change"}  ${file}  (${what})`);
      if (write) writeFileSync(file, result.text);
    }
  }
  console.log(`\n${changed} post${changed === 1 ? "" : "s"} ${write ? "migrated" : "would be migrated"}${body ? `, ${bodyCount} pictures in the text turned into {% figure %}` : ""}.`);
  for (const [why, files] of Object.entries(skipped)) console.log(`Skipped (${why}): ${files.length > 4 ? `${files.length} files` : files.join(", ")}`);
  if (leftOver.length) console.log(`\nLeft alone (not on a line of their own, or raw HTML), please look at these:\n${leftOver.map((l) => `  ${l}`).join("\n")}`);
  if (!write && changed) console.log("\nNothing written. Add --write to make the changes.");
}
