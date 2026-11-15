# Drafts

Add `draft: true` to a post's front matter to work on it locally without publishing it.

```yaml
---
title: "Torn"
draft: true
---
```

| How you run it | Drafts |
| --- | --- |
| `npm start` (and `eleventy --watch`) | Shown, like any other post |
| `npm run build`, which Netlify runs | Left out entirely: no page, and not in lists, feeds, tag pages or related posts |
| `SHOW_DRAFTS=1 npx eleventy` | Shown in a build (to check one on purpose) |

The build prints `[drafts] left out of this build: ...` so you can see what was held back.

Remove the line, or set `draft: false`, when it is ready.

It is opt-in per post. A post without `draft:` is always published. You can also put `draft: true` in a folder's data file to hold back everything in it.

## Install

1. Copy `_config/drafts.js`.
2. `eleventy.config.js`:
   ```js
   import { addDrafts } from "./_config/drafts.js";
   // inside the config function:
   addDrafts(eleventyConfig);
   ```

Your `working` projects already treat `draft: true` as "don't publish" (in `_config/working.js`). This does the same for every other kind of post.

## Things to know

- **Links to a draft** from a published page will point at a page that doesn't exist in production. Take them out before the post goes live.
- **A draft you have already published** disappears on the next deploy. That is the point, but check before you flag an old post as a draft.
- **Webmentions** you might have received for a draft are not shown, as it has no page.
- **Test:** `node scripts/drafts-test.mjs`
