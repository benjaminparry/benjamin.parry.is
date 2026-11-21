# Checks the pull quote include with Jinja2 (stand-in for Nunjucks) and a Markdown renderer.
import re, sys
from jinja2 import Environment, DictLoader
from markdown_it import MarkdownIt

macro = open("source/_includes/macros/pullquote.html").read()
post = """{% from "macros/pullquote.html" import pullquote %}

An opening paragraph in the post.

{% call pullquote() %}
Repeated text, with <em>emphasis</em> & a <a href="/x/">link</a>.
{% endcall %}

A paragraph after it.

{{ pullquote("Plain <text> & more", options={ "align": "right" }) }}

{{ pullquote("Visible repeat", options={ "duplicate": false, "class": "extra" }) }}

{% call pullquote(by="Ada", url="https://example.com/a") %}
Someone else's <em>words</em>.
{% endcall %}

{{ pullquote("Name only", by="Grace") }}

{{ pullquote("Url only", url="https://example.com/b", options={ "source": "Example" }) }}

{{ pullquote("Url only, no source", url="https://example.com/c") }}

{% call pullquote(by="Multi", options={ "paragraphs": true }) %}
<p>First para.</p>
<p>Second para.</p>
{% endcall %}

Last paragraph.
"""
env = Environment(loader=DictLoader({"macros/pullquote.html": macro}), autoescape=True)
rendered = env.from_string(post).render()
html = MarkdownIt("commonmark", {"html": True}).render(rendered)
n = ok = 0
def check(name, cond):
    global n, ok
    n += 1; ok += bool(cond)
    if not cond: print("FAIL", name)

check("3 repeats and 4 quotations", html.count('class="pullquote pullquote--repeat') == 3 and html.count("<figure") == 5)
check("no aside anywhere", "<aside" not in html)
check("not wrapped in paragraphs or code", "<p><div" not in html and "<p><figure" not in html and "<pre" not in html and "&lt;div" not in html)
check("surrounding paragraphs intact", all(s in html for s in ["<p>An opening paragraph in the post.</p>", "<p>A paragraph after it.</p>", "<p>Last paragraph.</p>"]))
check("repeat is aria-hidden", '<div class="pullquote pullquote--repeat" aria-hidden="true">' in html)
check("repeat call form keeps HTML", '<em>emphasis</em> &amp; a <a href="/x/">link</a>.</p>' in html or '<em>emphasis</em> & a <a href="/x/">link</a>.</p>' in html)
check("repeat argument text is escaped", "Plain &lt;text&gt; &amp; more" in html)
check("align class", 'pullquote--repeat pullquote--right" aria-hidden="true"' in html)
check("duplicate false is not hidden, extra class", re.search(r'<div class="pullquote pullquote--repeat extra">', html))
check("quotation is never aria-hidden", "aria-hidden" not in re.search(r"<figure.*?</figure>", html, re.S).group(0))
check("quotation has cite and linked caption", '<blockquote cite="https://example.com/a">' in html and '<figcaption><a href="https://example.com/a">Ada</a></figcaption>' in html)
check("quotation call form keeps HTML", "Someone else's <em>words</em>." in html)
check("name only has plain caption and no cite", '<blockquote><p>Name only</p></blockquote>' in html and "<figcaption>Grace</figcaption>" in html)
check("url only uses source option", '<a href="https://example.com/b">Example</a>' in html)
check("url only falls back to Source", '<a href="https://example.com/c">Source</a>' in html)
check("name is not wrapped in cite element", "<cite" not in html)
check("no blank lines inside any output", all("\n\n" not in m for m in re.findall(r"<(?:figure|div class=\"pullquote).*?</(?:figure|div)>", rendered, re.S)))
check("multi-paragraph has two p and no wrapping p", "<blockquote><p>First para.</p>\n<p>Second para.</p></blockquote>" in html)
check("multi-paragraph is not broken out of the figure", html.count("<p>Second para.</p>") == 1 and "Multi</figcaption>" in html)
check("default still wraps in one p", "<blockquote><p>Name only</p></blockquote>" in html)
print(f"{ok} of {n} passed")
sys.exit(0 if ok == n else 1)
