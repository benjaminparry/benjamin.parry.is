# Post images

Posts can have a **hero** (top of the page), a **feed image** (in the Atom feed and lists), **social images** (Open Graph and Twitter cards) and **supporting images** (used in the text with `{% figure %}` and in a gallery that works without JavaScript).

It is on `/writing/` only. To add another post type, copy `source/writing/writing.11tydata.js` into that folder, then add the partials to its layout (below).

## Front matter

```yaml
media:
  hero:
    src: /assets/images/writing/2026/11/harbour.jpg
    alt: Fishing boats tied up in a grey harbour at dawn
    caption: Dawn at the harbour
    source: https://example.com/photo-page
  feed:
    src: /assets/images/writing/2026/11/harbour-square.jpg
  social:
    - src: /assets/images/writing/2026/11/harbour-1200x630.jpg
      alt: Fishing boats tied up in a grey harbour at dawn
  images:
    - id: net
      src: /assets/images/writing/2026/11/net.jpg
      alt: A blue fishing net heaped on the quay
      caption: The net
      source: https://example.com/net
    - id: gull
      src: /assets/images/writing/2026/11/gull.jpg
      decorative: true
  gallery: true
```

| Key | Notes |
| --- | --- |
| `hero` | One image. Shown above the text. |
| `feed` | One image. Used in the feed and in post lists. Falls back to the old `images:` list's first entry. |
| `social` | One or more. Falls back to `hero`, then `feed`. 1200 × 630 works best; under 600 px wide is warned about. |
| `images` | Supporting images. `id` defaults to the file name. |
| `gallery` | `true` shows every supporting image as a grid after the text. |

Each image takes `src` (required), `alt`, `caption`, `source` (a URL, shown as its host name), `decorative: true` (for pictures that add nothing for a screen reader), and `id`.

**Alt text:** if it's missing you get `alt=""` and a build warning (`[media] path: ...`). Add `decorative: true` to silence it on purpose.

The old `images:` list of URLs still works: its first entry is the feed image.

## In the text

On its own line, with a blank line either side (so Markdown leaves it alone):

```
{% figure "net" %}

{% gallery %}
{% gallery "net", "gull" %}
{% figure { src: "/assets/images/x.jpg", alt: "…", caption: "…" } %}
```

If a shortcode can't see the post's data, pass it in: `{% figure "net", mediaSet %}`.

## What you get

Width and height are read from the file when the site builds, so pictures don't jump as they load. Orientation is automatic and goes on the `<figure>`: `post-image--landscape`, `post-image--portrait` or `post-image--square` (within 5% of square counts as square). Phone photos with EXIF rotation are handled. The hero is `fetchpriority="high"` and not lazy; everything else is lazy.

Each figure has `id="figure-<id>"`, so `#figure-net` links to it.

## Install

1. Copy `_config/images.js`, `source/writing/writing.11tydata.js`, the three files in `source/_includes/partials/` and `post-images.css`.
2. `eleventy.config.js`:
   ```js
   import { addImages } from "./_config/images.js";
   // inside the config function:
   addImages(eleventyConfig);
   ```
   If your project has no `source/writing/writing.11tydata.js` already, use the one supplied. If you do, merge the `mediaSet` line into its `eleventyComputed`.
3. `layouts/writing-post.html`: add `{% include "partials/post-hero.html" %}` after the heading, date and summary and before `div.e-content`; add `{% include "partials/post-gallery.html" %}` after the content.
4. `layouts/base.html`: add `{% include "partials/social-meta.html" %}` in `<head>` after `<title>`, and put `post-images.css` in the `<style>` as you do for your other CSS.
5. `source/writing/writing.json`: add `"ogType": "article"`.
6. Post lists (`macros/writing-list-item.html`): use `post.data.mediaSet.feed` (with its `width`, `height` and `alt=""`) and fall back to `post.data.images[0]`.
7. Feed: in `_config/feed.js`, `feedContent` can start with `feedImageHtml(data.mediaSet?.feed)` (exported from `images.js`). In `atom-feed.njk`, inside each entry:
   ```njk
   {% if post.data.mediaSet.feed %}<link rel="enclosure" type="{{ post.data.mediaSet.feed.type }}" href="{{ post.data.mediaSet.feed.abs }}"/>{% endif %}
   ```

Social tags only appear on posts that have an image, so other pages are unchanged.

## Tests

```
node scripts/images-test.mjs
```

59 checks on image sizes (JPEG, PNG, GIF, WebP, AVIF, SVG, rotated phone photos), orientation, alt rules, the shortcodes and the social fallback.

## Limits

- No `srcset` or resizing. That needs an image plugin such as `@11ty/eleventy-img`. Until then, export images at a sensible size.
- Image files are read from the project, so `src` must point at a file that exists under your `assets` folder (missing files are warned about).
