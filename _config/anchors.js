// Heading anchors: a small link next to a heading so visitors can link to, and share, that part of a page.
//
//   <div class="heading-anchor-group">
//     <h2 id="this-that-maybe-this">This &amp; that, maybe this</h2>
//     <a class="heading-anchor" href="#this-that-maybe-this">
//       <span aria-hidden="true">#</span>
//       <span class="visually-hidden">Link to section: This &amp; that, maybe this</span>
//     </a>
//   </div>
//
// Why it is built this way (accessibility):
//   - The link sits NEXT TO the heading, not inside it. Inside, a screen reader would read "This & that, maybe this
//     link to section" every time it announces the heading, and the list of headings would be full of clutter.
//   - The "#" is hidden from assistive technology (aria-hidden), because it would be read as "number sign".
//     Instead the link has hidden text that says where it goes, so it makes sense in a list of links too.
//   - It is a real link, so it works with the keyboard and with no JavaScript, and it is always in the page
//     (the stylesheet only hides it visually until hover or focus).
//
// It works on finished HTML, so it does the same job for Markdown headings and for headings you write as HTML.
// Use it on one chunk of content, normally a post's body, e.g.  {{ content | headingAnchors(headingAnchors, anchors) | safe }}
// Headings outside that chunk (navigation, related lists, comments...) are never touched.

export const DEFAULTS = {
  symbol: "#",                 // what is shown. Anything: "#", "§", "¶", "🔗"
  levels: [2, 3, 4],           // which headings get one. h1 is the page title, so not by default
  position: "after",           // "after" or "before" the heading
  label: "Link to section:",   // hidden text read out before the heading's title
};

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === "#") {
      const number = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// "This & that, maybe this" -> "this-that-maybe-this". Accents are dropped (é -> e); letters in other scripts are kept.
export function headingSlug(text = "") {
  return String(text)
    .normalize("NFKD").replace(/[̀-ͯ]/g, "").normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

// What the `headingAnchors` setting means:
//   undefined / false  off
//   true               on, with the defaults (and anything set in _data/anchors.json)
//   { symbol: "§", levels: [2, 3] }   on, with these changes
export function settingsFor(setting, defaults = {}) {
  if (!setting) return undefined;
  const base = { ...DEFAULTS, ...defaults };
  const chosen = setting === true ? base : { ...base, ...setting };
  chosen.levels = [chosen.levels].flat().map(Number);
  return chosen;
}

const HEADING = /<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;

export function addHeadingAnchors(html, setting, defaults = {}) {
  const options = settingsFor(setting, defaults);
  if (!options || !html) return html;

  // ids already in the content, so a new one never clashes with them
  const used = new Set([...String(html).matchAll(/\sid=(?:"([^"]*)"|'([^']*)')/gi)].map((m) => m[1] ?? m[2]));

  return String(html).replace(HEADING, (whole, level, attributes = "", inner) => {
    if (!options.levels.includes(Number(level))) return whole;
    if (/\sdata-no-anchor(\s|=|$)/i.test(attributes)) return whole.replace(/\sdata-no-anchor(?:=(?:"[^"]*"|'[^']*'|[^\s>]*))?/i, "");

    const text = decode(inner.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
    if (!text) return whole;

    // keep an id you wrote yourself, otherwise make one from the title
    const given = attributes.match(/\sid=(?:"([^"]*)"|'([^']*)')/i);
    let id = given ? (given[1] ?? given[2]) : headingSlug(text);
    if (!id) return whole;
    if (!given) {
      const stem = id;
      for (let n = 2; used.has(id); n++) id = `${stem}-${n}`;
      used.add(id);
      attributes += ` id="${id}"`;
    }

    const heading = `<h${level}${attributes}>${inner}</h${level}>`;
    const link =
      `<a class="heading-anchor" href="#${escape(id)}">` +
      `<span aria-hidden="true">${escape(options.symbol)}</span>` +
      `<span class="visually-hidden">${escape(`${options.label} ${text}`.trim())}</span></a>`;
    return `<div class="heading-anchor-group">${options.position === "before" ? link + heading : heading + link}</div>`;
  });
}
