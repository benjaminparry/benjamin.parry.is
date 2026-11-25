# Tags: review and suggestions

Two tools built on the same engine (`_config/tags.js`). Neither changes a post: the review writes a report,
and the editor tool offers suggestions that you accept or ignore.

## 1. The review: `npm run tags`

```
node scripts/tag-review.mjs                    writes tag-review.md
node scripts/tag-review.mjs --min low          include weaker suggestions (default: medium)
node scripts/tag-review.mjs --max 3            at most 3 suggestions per post (default: 5)
node scripts/tag-review.mjs --section writing  one section only (collecting/thoughts, watching ...)
node scripts/tag-review.mjs --post writing/2025-11-06-trails-of-experience.md    one post, printed here
node scripts/tag-review.mjs --json tags.json   also save the suggestions as data
```

The report has, in order: how well connected the posts are now and after the suggestions; tags to tidy
(typos and singular/plural pairs, ideas that may be the same tag); tags used on one post only; topics that
come up in several posts but are not a tag; then suggestions for every post, by section.

*Reach* is how many other posts share at least one tag with a post. A post with a reach of 0 appears on no related-posts
list and no tag page with anything else, which is the discoverability problem.

How to read a suggestion: ● strong, ◐ likely, ○ possible. The words after it say why: the tag's name is in the
title, summary or body; similar posts carry it; or posts with a tag the post already has usually have it too.
The number is how many posts use the tag. Check the ones with "in the body" only, as these are the weakest.

## 2. The Zed extension: `tools/zed-tag-suggest/`

It starts `scripts/tag-lsp.mjs` (a language server) for the site you have open. In a post's front matter it gives you:

- **Completions** on the lines under `tags:`. Suggestions for this post come first, marked "suggested", then every tag you use,
  most used first. Hover or select one to see why it was suggested. `category:` completes from the categories in use.
- **A warning** on a tag no other post uses when it looks like a respelling ("Quantitive", "Event" next to "Events"),
  with a quick fix to change it. A brand-new tag only gets a faint hint.
- **Code actions** (`cmd-.` on the front matter): "Add tag X" for each suggestion, and "Add suggested tags".

Install (once):

1. Install Rust with `rustup` (Zed compiles the extension when you install it). Other ways of installing Rust need
   the `wasm32-wasip2` target added by hand.
2. In Zed run the action `zed: install dev extension` and choose the folder `tools/zed-tag-suggest`.
3. Open a post in `source/`. If suggestions do not appear, check Zed's language server log (`dev: open language server logs`).
   If Zed does not run the server for Markdown, add this to your settings:
   ```json
   { "languages": { "Markdown": { "language_servers": ["tag-suggest", "..."] } } }
   ```

The server reads all your posts when it starts, and again after you save one, so a tag you just added is known straight away.
In any project without `scripts/tag-lsp.mjs` it does nothing. It works in any editor that speaks the Language Server Protocol:
run `node scripts/tag-lsp.mjs`.

## Settings: `_config/tags.config.json`

- `ignore`: tags that are never suggested (`cycles`, `weeknotes`).
- `aliases`: other ways a tag appears in writing, so "screen reader" suggests Accessibility. Add to these as you notice misses.
- `onlyIn`: tags that are only suggested for posts in one section. The client sectors (Retail, Finance ...) are limited to `working`.
- `overlaps`: groups of tags that may be the same idea, listed in the report.
- `minUses`: how many posts must use a tag before its name is looked for in other posts (default 2).

## Tests

`node scripts/tags-test.mjs` (the engine) and `node scripts/tag-lsp-test.mjs` (the language server, over stdin and stdout).
Add to package.json: `"tags": "node scripts/tag-review.mjs"`, `"test:tags": "node scripts/tags-test.mjs && node scripts/tag-lsp-test.mjs"`.

## How good are the suggestions?

As a test, each tagged post's tags are hidden and the tool is asked to guess them. About 6 posts in 10 get a correct
tag in the top three, and about half of the tags you chose are found in the top five. Guesses that are good tags you never
added count as wrong, so it understates the tool. Posts with very little text (most `watching` items, listening, playing)
get few suggestions: they need your own judgement.
