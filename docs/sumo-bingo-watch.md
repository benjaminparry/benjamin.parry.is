# Bingo watch

A commentary box under each bingo card. It says how the card stands, which lines can still be a bingo and how likely, which results to watch, and which lines can no longer happen. All the working out is in `_config/sumo.js` (`bashoOutlook`), so the template only shows text.

## What it says

| Part | Meaning |
| --- | --- |
| Headline | Before the basho: the chance of a bingo over the tournament. During: days to go and the chance of a bingo by day 15 (winning line, losing line). Bingo reached: says so. After: whether there was one, and how close the nearest line got. |
| Results to watch | The rikishi whose ending moves the chance of a bingo most, and what each ending does to it: "Finishing winning takes it up to 85%; finishing losing takes it down to 9%." Those squares get a dashed outline on the card and "One to watch for a bingo" for screen readers. |
| Lines still possible | The likeliest lines, with who needs what ("Ura needs 3 wins from 5 bouts", "must win all 4 remaining bouts"). The rest are summarised. |
| Lines that can't happen | Lines ruled out, and why ("Row 2 can no longer be a bingo: Hokutofuji is out of the tournament and Chiyoshoma is already winning"), plus lines that are gone one way only. |
| All 12 lines | A table of the five rows, five columns and two diagonals, each as a winning and a losing line. |

## The rules it uses

A line is five squares in a row, across, down or corner to corner (top left to bottom right, top right to bottom left). It is a bingo when all five are winning (kachi-koshi) or all five are losing (make-koshi). Each line is checked both ways:

- **Complete**: all five are already what's needed.
- **Alive**: nothing rules it out and some squares are still to be decided.
- **Impossible**: a winning line is ruled out by any square that is losing or out, and a losing line by any square that is winning or out. An "out" square (injured, absent, retired) can never be either, so it kills the line both ways.

## How the chances work

- Each undecided rikishi gets a chance of finishing with 8 wins, from the bouts they have left and how they have done so far (`winChance`: their results pulled towards an even chance, so one good day doesn't swing it).
- A line's chance is the product of its undecided squares' chances.
- The chance of **any** bingo is worked out exactly from those, using inclusion and exclusion over the lines, so overlapping lines aren't counted twice. `scripts/watch-test.mjs` checks it against a 40,000-run simulation.
- A result "to watch" is found by fixing one square as winning, then as losing, and seeing how far the chance of any bingo moves.

**It's a rough guide, not odds.** It treats squares as separate, and ignores who fights whom, rank and injuries. The API's banzuke response only has bouts already fought, so it can't say who is fighting tomorrow. If you later add the day's pairings (the API's `torikumi` endpoint), they could be used to say "these two squares are fighting each other".

A basho that has finished by the Japan clock gets no prediction, just how it ended. If some squares have no final result in the data, it says so.

## Installing

1. Replace `_config/sumo.js` with the new one. Most of it is new code at the bottom; `bashoView` now also returns `outlook` and marks the squares to watch.
2. Copy `source/_includes/partials/sumo-bingo-commentary.html` into your partials. It has no blank lines in its output on purpose, because in a Markdown page a blank line ends an HTML block and the lines after it become stray paragraphs.
3. In `sumo-bingo-card.html`, inside the loop over `cards`, add this straight after the closing `</ol>` of the card:
   ```njk
   {%- include "partials/sumo-bingo-commentary.html" -%}
   ```
4. Optional, to outline the squares to watch: add `{% if square.watch %} rikishi--watch{% endif %}` to the class list on the `<li class="rikishi ...">`, and this after the square's state text:
   ```njk
   {% if square.watch %}<span class="off-screen">. One to watch for a bingo.</span>{% endif %}
   ```
5. Add the contents of `sumo-bingo-watch.css` to your sumo bingo stylesheet.
6. Run `node scripts/watch-test.mjs`.

## Accessibility

- A region labelled "Bingo watch" with real headings (h3, then h4s), lists, and a table with column and row headers behind a `details` toggle.
- The squares to watch have a dashed outline and spoken text, so it never relies on colour.
- Everything is plain text, so nothing is hidden from screen readers.

## Cost

Working out an unstarted card takes about half a second, because nothing is decided and every line is alive. Mid-basho it takes a few milliseconds, and a finished basho does no prediction.
