# Post images

Posts can have a **hero** (top of the page), a **feed image** (in the Atom feed and lists), **social images** (Open Graph and Twitter cards) and **supporting images** (used in the text with `{% figure %}` and in a gallery that works without JavaScript).

It works on `/writing/` and everything in `/collecting/` (thoughts, cycles, photos, ideas, links, lists and podcasts). To add another post type, see "Other post types".

## Front matter

The key is `pictures:`, not `media:`, because `media:` already holds `film`, `book` and so on on your watching, reading and listening posts.

```yaml
pictures:
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

The old `images:` list of URLs still works until you migrate it (below): its first entry is the feed image.

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

## Settings

At the top of `_config/images.js`:

```js
export const settings = {
  sizeAttributes: true,    // false: no width="" or height="" on any <img>
};
```

Or from `eleventy.config.js`: `addImages(eleventyConfig, { sizeAttributes: false });`

With it off, the pages, the gallery and the feed all leave the attributes out. The orientation classes stay. In your own templates write `{{ image.sizeAttrs | safe }}` instead of `width` and `height` by hand, so the setting applies there too.

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

## Migrating old posts

```
node scripts/migrate-images.mjs                # shows what would change, writes nothing
node scripts/migrate-images.mjs --write        # edits the files
node scripts/migrate-images.mjs source/writing # one folder only
node scripts/migrate-images.mjs --write --gallery
```

- The first image of `images:` becomes `pictures.feed` (the only one the old templates showed).
- Any others become `pictures.images`, each with an `# alt:` reminder. The build warns about the missing alt text until you write it, which gives you a to-do list.
- `--body` also converts pictures in the text (see below).
- `--gallery` also adds `gallery: true` to those posts. Left off, the extra images are stored but not shown, as before.
- An empty `images:` line is removed. A nested `images:` (like on the home page) is left alone.
- Only the `images:` lines change. Posts that already have `pictures:` are skipped, so it is safe to run twice.
- Check `git diff` afterwards.

Once migrated, delete the `images[0]` fallbacks from the templates.

### Pictures in the text (`--body`)

```
node scripts/migrate-images.mjs --body source/collecting          # preview
node scripts/migrate-images.mjs --body --write source/collecting
```

A line that is only a Markdown picture, `![A tree-lined road](/assets/images/road.jpg "The road home")`, becomes `{% figure "road" %}`. The picture moves to `pictures.images` with its alt text, and its title becomes the caption. A picture with no alt text gets the `# alt:` reminder.

Pictures in the middle of a sentence, several on one line, and raw `<img>` tags are not changed. The script lists them. A post whose text prints `{{ images }}` itself is skipped and listed, because migrating it would leave a blank picture.

## Collecting (thoughts, cycles, photos and the rest)

`source/collecting/collecting.11tydata.js` covers every folder under `/collecting/` and sets `ogType` to `article`. They all share `layouts/collecting-post.html` (ideas wrap it), so one layout edit covers them.

`layouts/collecting-post.html`: put the hero after the summary, and the gallery after the content.

```njk
  {% if summary %}<p class="p-summary">{{ summary }}</p>{% endif %}

  {% include "partials/post-hero.html" %}
```

```njk
  <div class="e-content">
    {{ content | safe }}
  </div>

  {% include "partials/post-gallery.html" %}
```

`macros/collecting.html`, `collectingItem` (used on `/collecting/`, the archives, tag pages and "related" lists):

```njk
  {% set blurb = post.data.summary or post.data.proposal %}
  {% set feed = post.data.mediaSet.feed %}
  <li>
    {% if feed %}
      {# Decorative: the title link beside it names the post, so the alt text is empty #}
      <img class="card--post__image card--post__image--{{ feed.orientation }}" src="{{ feed.src }}"{{ feed.sizeAttrs | safe }} alt="" loading="lazy" decoding="async">
    {% endif %}
```

(It replaces the `{% if post.data.images ... %}` block. Keep your own class names.) The feed edits in step 7 above apply to every feed, because they all use `atom-feed.njk`.

## Other post types

For a folder that isn't under `/collecting/`, copy `collecting.11tydata.js` into it under that folder's name (for example `watching/watching.11tydata.js`), fix the `import` path, then edit its layout as above. Don't use the key `media:` for pictures. It means film, book and so on on watching, reading and listening posts.

## Tests

```
node scripts/images-test.mjs
```

`scripts/migrate-test.mjs` has 21 more for the migration script. `scripts/images-test.mjs` has 68 checks on image sizes (JPEG, PNG, GIF, WebP, AVIF, SVG, rotated phone photos), orientation, alt rules, the shortcodes and the social fallback.

## Limits

- No `srcset` or resizing. That needs an image plugin such as `@11ty/eleventy-img`. Until then, export images at a sensible size.
- Image files are read from the project, so `src` must point at a file that exists under your `assets` folder (missing files are warned about).
