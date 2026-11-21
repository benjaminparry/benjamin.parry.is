// Global paired shortcode: {% pullquote %}...{% endpullquote %}, no import needed in a post.
// It produces the same HTML as source/_includes/macros/pullquote.html. See docs/pullquote.md.
//
//   {% pullquote %}A sentence from this post.{% endpullquote %}                      (repeat, visual only)
//   {% pullquote "Ada Lovelace", "https://example.com/" %}Their words.{% endpullquote %}   (quotation)
//   {% pullquote by="Ada", url="https://example.com/", align="right" %}...{% endpullquote %}
//
// Unlike the macro, blank lines inside the quote are fine: each blank-line-separated block becomes a paragraph.
// The quote is raw HTML, not Markdown: write <em>like this</em>, not *like this*.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
const ALIGNS = ["left", "right", "center"];

// Split on blank lines into paragraphs. A block that already starts with <p is left alone.
export function paragraphs(content) {
  return String(content ?? "")
    .trim()
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (/^<p[\s>]/i.test(s) ? s : `<p>${s}</p>`));
}

// Positional strings are by, url (use "" to skip by). Objects (Nunjucks keyword arguments, or an options object) are merged in.
export function readArgs(args) {
  const o = {};
  const positional = [];
  for (const a of args) {
    if (a && typeof a === "object") {
      const { __keywords, options, ...rest } = a;
      Object.assign(o, options && typeof options === "object" ? options : {}, rest);
    } else positional.push(a);
  }
  return {
    by: o.by ?? positional[0],
    url: o.url ?? positional[1],
    source: o.source,
    align: ALIGNS.includes(o.align) ? o.align : undefined,
    duplicate: o.duplicate !== false && o.duplicate !== "false",
    cls: o.class,
  };
}

export function pullquote(content, ...args) {
  const { by, url, source, align, duplicate, cls } = readArgs(args);
  const body = paragraphs(content);
  if (!body.length) return "";
  const extra = (align ? ` pullquote--${align}` : "") + (cls ? ` ${esc(cls)}` : "");

  if (by || url) {
    const who = url
      ? `<a href="${esc(url)}">${esc(by || source || "Source")}</a>`
      : esc(by);
    return (
      `<figure class="pullquote${extra}">\n` +
      `  <blockquote${url ? ` cite="${esc(url)}"` : ""}>${body.join("\n")}</blockquote>\n` +
      `  <figcaption>${who}</figcaption>\n` +
      `</figure>`
    );
  }
  return (
    `<div class="pullquote pullquote--repeat${extra}"${duplicate ? ' aria-hidden="true"' : ""}>\n` +
    `  ${body.join("\n  ")}\n` +
    `</div>`
  );
}

export function addPullquote(eleventyConfig) {
  eleventyConfig.addPairedShortcode("pullquote", pullquote);
}
