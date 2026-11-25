// Reads the posts from disk for the tag tools (scripts/tag-review.mjs and scripts/tag-lsp.mjs).
// Kept apart from tags.js so that file stays free of anything but plain logic.

import fs from "node:fs";
import path from "node:path";
import { makePost, isPostPath, buildIndex } from "./tags.js";

function* walk(dir, base = dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full, base);
    else yield path.relative(base, full).split(path.sep).join("/");
  }
}

// Every post in source/ (or another folder), as { rel, text }
export function readPosts(root, contentDir = "source") {
  const base = path.join(root, contentDir);
  const out = [];
  for (const rel of walk(base)) {
    if (!isPostPath(rel)) continue;
    out.push({ rel, text: fs.readFileSync(path.join(base, rel), "utf8") });
  }
  return out;
}

// The settings in _config/tags.config.json, if there is one
export function readConfig(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, "_config", "tags.config.json"), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw new Error(`_config/tags.config.json could not be read: ${error.message}`);
  }
}

export function loadIndex(root, contentDir = "source") {
  const config = readConfig(root);
  const posts = readPosts(root, config.contentDir ?? contentDir).map(makePost);
  return buildIndex(posts, config);
}
