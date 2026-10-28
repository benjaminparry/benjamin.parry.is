# /working/

Who I have worked for, what I worked on, and how the two connect.

## What you write

Only projects, in `source/working/`. Everything else is worked out from them.

```yaml
---
title: Understanding healthcare needs
start: 2017-01              # when it began: 2017, 2017-01 or 2017-01-24
duration: 8 weeks           # how long it ran (or use end:)
employer: Clearleft         # who I was working for. Leave out when freelancing.
client: Patient             # who the work was for. Leave out, or same as employer, for in-house work.
sector: [Healthcare]
featured: true              # spotlight it
caseStudyURL: https://clearleft.com/work/patient-vision
cta: Read the case study
hero:
  image: /assets/images/patient.jpg
  imageAlt: Describe the image
---
```

`employer` and `client` are names, not file names. "Clearleft" and "clearleft" are one organisation, and an organisation exists as soon as a project names it.

| Situation | employer | client | Shown as |
| --- | --- | --- | --- |
| Agency work | Clearleft | Waitrose | At Clearleft, for Waitrose |
| In-house | Waitrose | (none, or Waitrose) | In-house at Waitrose |
| Freelance | (none) | Clearleft | Freelance, for Clearleft |

Because Clearleft is one organisation, its page shows the job I had there and a freelance project I did for them later.

## Dates

A date can be as exact as I know it: `2017`, `2017-01` or `2017-01-24`. It is shown that way too ("2017", "January 2017", "24 January 2017"), and a worked-out date is never more exact than the start.

| You write | It means |
| --- | --- |
| `start: 2023-06` and `end: 2023-08` | June to August 2023, 3 months. The end month counts. |
| `start: 2023-06` and `duration: 8 weeks` | Ends July 2023. "8 weeks" is shown as you wrote it. |
| `start: 2025-07` and `end: present` | Still going. Shown as "July 2025 – present (1 year 3 months)". |
| `start: 2019-01` only | Started January 2019, end not known. |
| `date: 2017-01` | The same as `start`, so existing files work as they are. |

Only `end: present` (or `current: true`) means ongoing. A missing end is never treated as current, so half-filled files do not all appear under "Working on now". A `duration` that cannot be read (like the placeholder `duration`) is ignored.

Other ways it could be designed, not built:
- One field as an ISO interval, `dates: 2023-06/2023-08` (shorter, but harder to read and edit).
- A list of periods, `periods: [{start, end}]`, for a project I went back to.
- `start` plus a `finished: true` flag instead of `end: present`.

## URLs

| Page | URL |
| --- | --- |
| A project | `/working/2017/01/understanding-healthcare-needs/` |
| Projects, newest first | `/working/` and `/working/page/2/` |
| Archives | `/working/2017/` and `/working/2017/01/` |
| Working history | `/working/history/` and `/working/history/clearleft/` |
| Organisations | `/working/organisations/` and `/working/organisations/clearleft/` |
| Sectors | `/working/sectors/` and `/working/sectors/healthcare/` |

A project's URL comes from its `start` (or `date`) and its `title`, never from the file name, so you can rename files freely. `slug: my-name` replaces the title in the URL. Once a page is published, add `slug:` before you reword the title, or the URL changes. Two projects with the same title in the same month need different slugs, and the build log says so.

`permalink: false` in a project is ignored (the pages are built from the front matter). To unpublish one, use `hidden: true`.

## History

Until you add history files, the working history is worked out from the projects: each employer, from its earliest project to its latest, marked "dates from projects". Freelance projects (no employer) become one "Freelance" row.

For exact dates, add `source/working/history/clearleft.md`. It replaces the worked-out row for that employer.

```yaml
---
employer: Clearleft
role: Senior UX designer
start: 2017-03
end: 2024-03        # or: present
summary: What the job was.
---
```

Use several files for several stretches (a rehire, a promotion). Each project is matched to the stretch for its employer that includes its start date, or you can name one with `engagement: <file name>`. `type: freelance` or `type: contract` is available; the default is employed when there is an employer.

## Organisations

For a description, website or sector, add `source/working/organisations/clearleft.md`.

```yaml
---
title: Clearleft
website: https://clearleft.com
sector: Design
summary: A design agency in Brighton.
---
```

Not needed otherwise. These files only supply details; the pages are built from the projects.

## Sectors and tags

Write `sector:` on a project and it is also a tag, so `/tagging/healthcare/` finds it next to your writing and links, and related content can use it. A separate field means `/working/sectors/` lists only sectors, not every topic tag.

A project with no `sector` takes its client's, or its employer's if it has no client. An organisation's sectors are its file's, or those of the projects done for it. Only a sector written on the project itself becomes a tag.

## Fields that are not used yet

`displayOrder`, `displayType` and `posse` are ignored. `summary` is the one-line description in lists.

## When something is wrong

The build does not stop. It prints a `[working]` line in the log and the page shows what it can: a project with no readable start, a project dated outside every history entry for its employer, two projects at one URL, a `engagement:` that matches nothing.

## Not decided yet

- Freelancing through an agency for an end client has nowhere to say who the intermediary was.
- A project that moves between jobs (agency, then freelance for the same client) is one project in one job, so it needs two files.
- Work under NDA, where the client should not be named.
- A controlled list of sectors: your files already have both "Finance" and "Financial Services".
- "1 year 3 months" is worked out when the site is built, so it only changes when the site is rebuilt.
