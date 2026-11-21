# Pull quote

Files: `source/_includes/macros/pullquote.html`, `source/assets/css/pullquote.css`
Link the CSS in base.html before global.css: `<link rel="stylesheet" href="/assets/css/pullquote.css">`

Import once per post: `{% from "macros/pullquote.html" import pullquote %}`

| Use | Call | Output |
|---|---|---|
| Repeating this article's own text (visual only) | `{% call pullquote() %}text{% endcall %}` | `<div class="pullquote pullquote--repeat" aria-hidden="true">` |
| Quoting someone else | `{% call pullquote(by="Name", url="https://…") %}text{% endcall %}` | `<figure><blockquote cite><p>…</p></blockquote><figcaption>…</figcaption></figure>` |

Rule: passing `by` or `url` means a quotation; passing neither means a repeat.

Several paragraphs in a quotation: pass `"paragraphs": true` and write your own `<p>` tags inside the call, with no blank
lines between them. The opening quote mark shows on every paragraph and the closing one only on the last.

Options (quote the keys): `"paragraphs"`, `"align"` left/right/center, `"duplicate": false` (a repeat that is read by screen readers,
for text not in the post), `"source"` (link text when there is a url but no name), `"class"`.
Keep the text free of blank lines, or Markdown ends the HTML block.

## Global shortcode (no import line)

`_config/pullquote.js` adds `{% pullquote %}…{% endpullquote %}`. It outputs the same HTML as the macro.

In `eleventy.config.js`:

```js
import { addPullquote } from "./_config/pullquote.js";
// inside the config function:
addPullquote(eleventyConfig);
```

```
{% pullquote %}A sentence from this post.{% endpullquote %}

{% pullquote "Ada Lovelace", "https://example.com/" %}
Someone else's words.

A second paragraph, because blank lines are fine here.
{% endpullquote %}

{% pullquote by="Ada", url="https://example.com/", align="right" %}Keyword form.{% endpullquote %}
```

Positional: name, then url (use `""` to skip the name). Keywords: `by`, `url`, `source`, `align`, `duplicate`, `class`.
Differences from the macro: blank lines are allowed (each block becomes a paragraph, so no `"paragraphs"` option is needed),
and the content is raw HTML, not Markdown, so write `<em>like this</em>`.
Keep the macro for layouts that render a front matter value; both can live side by side.
Tests: `node scripts/pullquote-js-test.mjs`, `python3 -I scripts/pullquote-same-test.py`.
