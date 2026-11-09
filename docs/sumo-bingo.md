# Sumo bingo

Each grand sumo tournament (basho) I get a bingo card: a 5 × 5 grid of rikishi from the top division (Makuuchi). Cards are shown on the pages in `/making/`, one page per year.

## The rules

- A basho runs for 15 days. Each rikishi fights once a day.
- **Kachi-koshi**: 8 wins. This is a **winning square**.
- **Make-koshi**: 8 losses. This is a **losing square**.
- A rikishi who pulls out injured (a forfeit), doesn't turn up (absent) or retires is **out**. They can't reach 8 wins, so the square is dead.
- A **bingo** is five winning squares or five losing squares in a row: across, down, or corner to corner (top left to bottom right, top right to bottom left). Mixed rows don't count.
- Priority when deciding a square: kachi-koshi, then make-koshi, then out, then still pending.

## How it fits together

| Piece | Where |
| --- | --- |
| Data, one file per basho | `source/_data/basho/YYYY-MM.json` |
| All the logic (totals, squares, bingo lines, importer helpers) | `_config/sumo.js` |
| Eleventy filters `bashoInYear` and `bashoViews` | `eleventy.config.js` |
| The markup for a year's cards | `source/_includes/partials/sumo-bingo-card.html` |
| One page per year | `source/making/sumo-bingo-cards-YYYY.md` |
| Styles | `sumo-bingo.css` |
| Fill results from sumo-api.com | `scripts/import-basho.mjs` |
| Turn the old yearly files into per-basho files (one-off, already done) | `scripts/migrate-basho.mjs` |
| Tests for the API mapping | `scripts/api-test.mjs` |

Nothing is stored that can be worked out. Totals, winning and losing squares and bingo lines are all calculated from the daily `results` when the site builds, so there is nothing to keep in step by hand.

## The data file

Folders inside `_data/` become keyed data, so `source/_data/basho/2025-07.json` is available to templates as `basho["2025-07"]`.

```json
{
  "id": "2026-11",
  "start": "2026-11-08",
  "end": "2026-11-22",
  "days": 15,
  "city": "Fukuoka",
  "venue": "Fukuoka Kokusai Center",
  "venueUrl": "https://maps.app.goo.gl/...",
  "sumokaboom": { "id": "212", "url": "https://..." },
  "yusho": "onosato",
  "card": ["tokihayate", "kotoshoho", "...25 ids in all"],
  "rikishi": {
    "onosato": { "name": "Onosato", "api": 8850, "results": "wwwlwwwlwlwwlww" },
    "hoshoryu": { "name": "Hoshoryu", "api": 19, "results": "wlllfaaaaaaaaaa" }
  }
}
```

| Field | Meaning |
| --- | --- |
| `id` | `YYYY-MM`, the month the basho starts. Must match the file name. |
| `start`, `end` | First and last day (a Sunday and the Sunday two weeks later). |
| `days` | 15 |
| `city`, `venue`, `venueUrl`, `sumokaboom` | Optional extras shown on the page. |
| `yusho` | The winner. Optional, and must be on the card. |
| `card` | **Yours.** 25 rikishi ids, left to right, top to bottom. |
| `rikishi` | Each rikishi's `name` and `results`. The importer fills this in. |
| `api` | Optional. The rikishi's id on sumo-api.com, added by the importer. |
| `playoff` | Optional. Playoff bouts, e.g. `1`. |

A rikishi id is their name lower-cased with no accents or spaces, e.g. `"Onosato"` becomes `"onosato"`.

### `results`

One character per day, 15 in all:

| Character | Meaning |
| --- | --- |
| `w` | Won (including a win because the opponent pulled out) |
| `l` | Lost |
| `f` | Forfeited: pulled out injured, so the day was lost by default |
| `a` | Absent: didn't take part |
| `r` | Retired |
| `-` | Not fought yet |

Example: `"wlllfaaaaaaaaaa"` is a win, three losses, a forfeit on day 5, then absent for the rest.

A basho entered before daily results existed can hold totals instead: `"record": { "wins": 6, "losses": 4 }`. The site uses the daily results when there are any, and otherwise those totals.

## Starting a new basho

All the script needs is the basho and your 25 rikishi, left to right and top to bottom:

```
node scripts/import-basho.mjs 2026-11 --card tokihayate,kotoshoho,...          # preview
node scripts/import-basho.mjs 2026-11 --card tokihayate,kotoshoho,... --write  # create the file
```

Or create `source/_data/basho/2026-11.json` yourself with only this and run the script without `--card`:

```json
{ "id": "2026-11", "card": ["tokihayate", "kotoshoho", "...25 in all"] }
```

Names can be written any way (`Tokihayate` or `tokihayate`). They are turned into ids. The script then fills in:

- `start`, `end` and `days` from the API. If the API doesn't know the basho yet, it uses the usual second Sunday and says so. Run it again later with `--force` to confirm the dates.
- `city`, `venue` and `venueUrl`, copied from your most recent basho in the same month. It says when it does this, so check them if the venue has changed. The API doesn't hold venues.
- A `rikishi` entry for everyone on the card: their name, API id and results.
- `yusho`, once the basho is over and the winner is on your card.

If the year has no page yet, copy a `source/making/sumo-bingo-cards-YYYY.md`. The body is only the include, and the front matter needs `bashoYear`:

```md
---
title: 'Sumo bingo cards 2027'
bashoYear: 2027
---
{% include "partials/sumo-bingo-card.html" %}
```

Then run the importer again after each day's bouts (below).

## Filling in results from the API

Results come from [sumo-api.com](https://www.sumo-api.com/api-guide), which is free. Please use it kindly: the script asks for one page and keeps a copy for an hour.

```
node scripts/import-basho.mjs 2026-11           # preview. Writes nothing
node scripts/import-basho.mjs 2026-11 --write   # save into the data file
```

It reads two pages: `GET /api/basho/:bashoId/banzuke/Makuuchi` (every rikishi's day-by-day record) and `GET /api/basho/:bashoId` (dates and winner).

| Option | What it does |
| --- | --- |
| `--write` | Save the changes. Without it nothing is written. |
| `--card a,b,c` | The 25 rikishi, for starting a basho with no file yet. Ignored if the file exists. |
| `--force` | The API wins: replace saved days that differ, and correct `start`, `end` and `yusho`. Each change is listed. |
| `--through 6` | Only trust the first 6 days. By default it counts a day as finished from 18:30 Japan time that evening. |
| `--refresh` | Ignore the saved copy in `.cache/sumo-api/` and ask again. |
| `--file`, `--basho-file` | Use saved API responses instead of asking online (for testing). |

What it does and doesn't do:

- Only rikishi on your card are touched. A name that isn't in that basho's makuuchi list is reported, and you can set its `api` id by hand.
- Without `--force`, a day that already has a result is never changed. Only `-` days are filled, and disagreements are listed.
- A day the API hasn't played yet never replaces a saved result, even with `--force`. The API can show unplayed days as `absent`, so days after the clock's cut-off are kept as `-`.
- It refuses to write if the response is for a different basho or division.
- The API counts a forfeit as a loss. Here a forfeit (`f`) is kept apart from losses and the days after it are `a`, so the card's totals can differ from the official ones. A rikishi with 8 wins is still a winning square.
- If the yusho winner isn't on your card, it says so and leaves `yusho` alone.
- Old totals-only entries (`record`) are checked against the new daily results, and mismatches are listed.
- It isn't part of the Eleventy build. Run it yourself, check `git diff`, then commit.
- Add `.cache/` to `.gitignore`.

If a rikishi isn't found, their name may be spelt differently by the API. Set `"api"` on their entry to the API's `rikishiID`.

## What the page shows

For each basho: the 25 squares with each rikishi's score, state (winning, losing, out or pending) and day-by-day results, the totals, and any bingo lines. Each square has a side-stacked bar: wins grow from the left, losses from the right, forfeits and retirements from the centre, and days still to come sit in the space between. The state is also written as text, so colour is never the only signal.

The build warns (`[sumo] 2026-11: ...`) about bad data without stopping: a card with other than 25 squares, a duplicate, a card id with no `rikishi` entry, a `results` that isn't 15 long or has a character other than `w l f a r -`, and a `yusho` that isn't in `rikishi`.

## Styling

`sumo-bingo.css` is self-contained and uses custom properties, so colours are set in one place. Classes: `.record-bar`, `.rikishi__state`, `.bingo-result`, `.bingo-legend`, and `rikishi--kachi-koshi`, `rikishi--make-koshi`, `rikishi--absent`, `rikishi--retired` and `rikishi--saiko` (the basho winner) for the square states.

## Tests

```
node scripts/api-test.mjs path/to/saved-banzuke-202507.json
```

It checks the API mapping: every daily result adds up to the API's own totals, forfeits and absences, the clock guard, and `--force`.

## Known limits

- Only Makuuchi is supported (the API's division for the card).
- Playoffs aren't in the banzuke response, so `playoff` is entered by hand.
- Special prizes (sansho) and lower-division winners are available from the API but aren't stored.
- Some basho (July 2024, July 2025 and March 2026) were first entered with totals only. Running the importer with `--force` fills in their days.
