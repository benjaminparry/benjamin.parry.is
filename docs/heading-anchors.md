# Heading anchors

A small link next to a heading, so a visitor can link to (and share) that part of a page: `https://example.com/writing/2025/06/a-post/#this-that-maybe-this`.

```html
<div class="heading-anchor-group">
  <h2 id="this-that-maybe-this">This &amp; that, maybe this</h2>
  <a class="heading-anchor" href="#this-that-maybe-this">
    <span aria-hidden="true">#</span>
    <span class="visually-hidden">Link to section: This &amp; that, maybe this</span>
  </a>
</div>
```

## Installing (four small edits, plus the new files)

1. **Copy in the new files** (listed under Files below).
2. **`eleventy.config.js`**: add the import with the others at the top, and the filter with the other filters:
   ```js
   import { addHeadingAnchors } from "./_config/anchors.js";
   ...
   eleventyConfig.addFilter("headingAnchors", addHeadingAnchors);
   ```
3. **`source/_includes/layouts/base.html`**: inside the existing `<style>` block, after the last rule, add:
   ```njk
   {% include "partials/heading-anchors.css" %}
   ```
4. **The post layouts**: this one command changes the body line in the nine layouts that show a post body (writing, collecting, making, speaking, now, attending, celebrating, sending, working-project). Run it from the repo root:
   ```
   for f in writing-post collecting-post making-post speaking-post now-post attending-post celebrating-post sending-post working-project; do
     perl -pi -e 's/\{\{ content \| safe \}\}/{{ content | headingAnchors(headingAnchors, anchors) | safe }}/' source/_includes/layouts/$f.html
   done
   ```
5. **Switch it on for writing**: add `"headingAnchors": true,` to `source/writing/writing.json`.

Nothing changes on a page until step 5 (or `headingAnchors: true` in its front matter), because the setting is off by default.

## Turning it on

Anchors are **off** unless a page asks for them, so components and anything else that uses headings are never touched. The filter only works on the chunk of HTML you give it: a post's body, not the whole page.

| Where | How |
| --- | --- |
| A whole section (e.g. writing) | `"headingAnchors": true` in the folder's data file (`source/writing/writing.json`) |
| One page | `headingAnchors: true` in its front matter |
| One page, off | `headingAnchors: false` (overrides the folder) |
| One page, with changes | `headingAnchors: { levels: [2, 3], symbol: "§" }` |
| One heading, off | write it as HTML with `data-no-anchor`: `<h2 data-no-anchor>Related posts</h2>` (the attribute is removed from the output) |
| One heading, your own id | write it as HTML with an id: `<h2 id="my-id">Title</h2>`. The id is kept and the anchor points to it |

The layouts that show a post body call the filter, e.g. `source/_includes/layouts/writing-post.html`:

```njk
<div class="e-content">
  {{ content | headingAnchors(headingAnchors, anchors) | safe }}
</div>
```

`headingAnchors` is the page's setting from the table above, and `anchors` is the site-wide settings below. To use it on another kind of content, change that one line in its layout and set `headingAnchors` for it.

## Settings (`source/_data/anchors.json`)

| Setting | Default | |
| --- | --- | --- |
| `symbol` | `"#"` | The character shown. Try `"§"`, `"¶"` or `"🔗"`. |
| `levels` | `[2, 3, 4]` | Which headings get one. h1 is the page title, so it's left out. |
| `position` | `"after"` | `"before"` puts the link before the heading. |
| `label` | `"Link to section:"` | Hidden text read out before the heading's title. |

A page's own `headingAnchors: { ... }` overrides these for that page.

## The ids

An id is made from the heading's text: `This & that, maybe this` becomes `this-that-maybe-this`. Accents are dropped (`Café` becomes `cafe`) and letters in other scripts are kept. If two headings would get the same id, the second becomes `notes-2`, and so on. **Changing a heading's wording changes its link**, so someone's saved link would stop jumping to it. If a heading's link needs to stay put, give it an id by hand.

## Why it's built this way (accessibility)

- **The link is beside the heading, not inside it.** Inside, a screen reader would read "This & that, maybe this, link to section" each time it announces the heading, and the list of headings would be full of clutter.
- **The `#` is hidden from screen readers.** It would be read as "number sign". The link's accessible name is the hidden text instead ("Link to section: This & that, maybe this"), which also makes sense in a list of all the links on the page.
- **It's a real link**, so it works with a keyboard, with no JavaScript, and when the stylesheet fails.
- **It's always in the page.** With a mouse it's only shown when you hover the heading or tab to the link. On touch screens and for keyboard users it's always showing, because they can't hover.
- **The target is at least 24 × 24 px** (WCAG 2.2 target size) and has a focus outline.
- **The linked-to heading is underlined** (`:target`), so you can see which one it is without relying on colour.
- **Forced-colours mode** shows the link at full strength, and it's hidden when printing.

Tested in Chromium: heading names don't include the link text, each link's name reads `Link to section: <title>`, Tab focuses it, Enter jumps to the heading and sets the `:target`. It hasn't been tried with a real screen reader, so it's worth a quick pass with VoiceOver on your Mac (Safari, then `Ctrl+Option+Cmd+H` to jump between headings).

## Files

| | |
| --- | --- |
| `_config/anchors.js` | The filter (`headingAnchors`) and the slug maker |
| `source/_data/anchors.json` | Site-wide settings |
| `source/_includes/partials/heading-anchors.css` | Styles, to include in the layout's `<style>` |
| `scripts/anchors-test.mjs` | `node scripts/anchors-test.mjs` runs 32 checks |

## Limits

- The filter reads the finished HTML of one chunk of content, so headings from other places in a layout (like "More writing") are never changed.
- Headings inside code blocks are left alone, because Markdown has already turned them into text.
- Ids are unique within the content given to the filter, not across the whole page. If a layout has its own element with the same id as a heading, one of them would be a duplicate.
