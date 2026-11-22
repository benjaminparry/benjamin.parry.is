# Cycle links

Lists everything published, watched, played or listened to during a cycle, inside a cycle post.

## Setup

1. Copy `_config/cycles.js`, `source/_data/cycleSettings.js` and `scripts/cycles-test.mjs` into the repo.
2. In `eleventy.config.js`:
   ```js
   import { addCycles } from "./_config/cycles.js";
   // inside the config function:
   addCycles(eleventyConfig);
   ```
3. In a cycle post, where the links should go (the `## Rollup` section, say):
   ```
   ## Published this cycle

   {% cycleLinks %}
   ```

## How the dates are worked out

In order of trust:

1. Front matter, if you ever need to override: `cycle: { from: 2026-06-08, to: 2026-07-11 }` (either can be left out)
2. The file name: `2026-07-11-cycles-20260608-20260711.md` gives 8 June to 11 July, both days included
3. If neither gives a start: the day after the previous cycle ended, up to this post's date

A warning is printed in the terminal when a cycle starts on a different day to the one after the previous cycle ended
(a gap or an overlap). Dates are compared as calendar days, so time of day and time zones never matter.

## What counts as "in the cycle"

- writing, collecting and anything else: the post's own `date`
- watching, listening, playing: the dates inside the `watched:` / `listened:` / `played:` list, so rewatching an old film
  in this cycle includes it, and a series appears when it is finished (or started) in the cycle
- the cycle posts themselves are never listed, and neither are `index` files

## Choosing the output

```
{% cycleLinks %}                                        one heading and list per type (default)
{% cycleLinks only="writing,watching" %}                just those types
{% cycleLinks style="flat" %}                           one list, each link labelled with its type
{% cycleLinks level=4, order="desc" %}                  <h4> headings, newest first
{% cycleLinks headings=false %}                         bold labels instead of headings
{% cycleLinks empty="Nothing published this time." %}   text to show when there is nothing
```

You can call it more than once in a post, for example `only="writing"` under one heading and `only="watching,listening"` under another.
Style the output with `.cycle-links`, `.cycle-links__type`, `.cycle-links__kind` and `.cycle-links__note`.

## Full control: your own template

```njk
{% set cycle = collections.all | cycleContent(page, cycleSettings) %}
<p>{{ cycle.range.from | longDate }} to {{ cycle.range.to | longDate }}</p>
{% for section in cycle.sections %}{% if section.items.length %}
  <h3>{{ section.title }}</h3>
  <ul>{% for item in section.items %}
    <li><a href="{{ item.url }}">{{ item.title }}</a></li>
  {% endfor %}</ul>
{% endif %}{% endfor %}
```

Each item has `title`, `url`, `date` (YYYY-MM-DD), `kind` (done, started, finished), `count`, `type`, `note`, `section`.
The range dates are text (YYYY-MM-DD), so use them as they are rather than through `longDate`, or turn them into a Date first.

## Adding another type

Add a line to `source/_data/cycleSettings.js`. If the type has dated entries like `watched:`, give its `activityKey`.

## Tests

`node scripts/cycles-test.mjs`
