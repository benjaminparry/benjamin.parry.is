# The macro and the shortcode must output identical HTML. Needs node and jinja2 (Jinja2 stands in for Nunjucks).
import json, subprocess, sys
from jinja2 import Environment, DictLoader
macro = open("source/_includes/macros/pullquote.html").read()
env = Environment(loader=DictLoader({"m": macro}), autoescape=True)
cases = [
  dict(body="Repeat <em>text</em>.", args=[]),
  dict(body="Visible repeat", args=[{"duplicate": False}]),
  dict(body="Quote.", args=["Ada", "https://example.com/a?x=1&y=2"]),
  dict(body="Quote.", args=["Grace"]),
  dict(body="Quote.", args=["", "https://example.com/b", {"source": "Example"}]),
  dict(body="Quote.", args=["Ada", None, {"align": "right", "class": "extra"}]),
  dict(body="<p>One.</p>\n<p>Two.</p>", args=["Ada", None, {"paragraphs": True}]),
]
node = "import {pullquote} from './_config/pullquote.js';const c=%s;console.log(JSON.stringify(c.map(x=>pullquote(x.body,...x.args.map(a=>a===null?undefined:a)))))" % json.dumps(cases)
js = json.loads(subprocess.run(["node", "--input-type=module", "-e", node], capture_output=True, text=True, check=True).stdout)
bad = 0
for case, j in zip(cases, js):
    a = case["args"]; by = a[0] if a and isinstance(a[0], str) and a[0] else None
    url = a[1] if len(a) > 1 else None
    opts = next((x for x in a if isinstance(x, dict)), {})
    src = '{% from "m" import pullquote %}{% call pullquote(by=by, url=url, options=opts) %}' + case["body"] + "{% endcall %}"
    m = env.from_string(src).render(by=by, url=url, opts=opts)
    if m != j:
        bad += 1; print("DIFF\n macro:", repr(m), "\n js:   ", repr(j))
print(f"{len(cases) - bad} of {len(cases)} identical")
sys.exit(bad)
