# /working/

Who I have worked for, what I worked on, and how the two connect.

## The model

Three kinds of file. Every relationship is a front matter value that names another file.

| Kind | Where | URL | What it is |
| --- | --- | --- | --- |
| Organisation | `source/working/organisations/clearleft.md` | `/working/organisations/clearleft/` | A company I have worked **for or with**. It is never labelled "employer" or "client", because one organisation can be both. |
| Engagement | `source/working/history/2017-04-03-clearleft.md` | `/working/history/clearleft/` | One stretch of working life, the working history. Who paid me, and how. The date in the file name is the start. |
| Project | `source/working/2024-03-28-opa-winner.md` | `/working/2024/03/opa-winner/` | Something I worked on, during one engagement, usually for one client. The date in the file name is the start. |

The name of an organisation or engagement file (without the date, `.md`) is what other files refer to.

### Your contexts

| Situation | Engagement | Project | Shown as |
| --- | --- | --- | --- |
| Employed by an agency, working for a client | `type: employed`, `employer: clearleft` | `client: waitrose` | At Clearleft, for Waitrose |
| Employed in-house, several projects | `employer: waitrose` | no client (or the same one) | In-house at Waitrose |
| Freelancing for a client | no `employer` | `client: waitrose` | Freelance, for Waitrose |
| Freelancing for a previous employer | no `employer` | `client: clearleft` | Freelance, for Clearleft |
| In-house at a previous client | `employer: waitrose` | | In-house at Waitrose |

Because Waitrose is one organisation file, its page shows the agency project I did **for** it and the in-house role I have **at** it. Clearleft's page shows the job and the later freelance project. Nothing is entered twice.

## Templates

`source/working/organisations/clearleft.md`

```yaml
---
title: Clearleft
website: https://clearleft.com
sector: Design
summary: A design agency in Brighton.
---
Anything written here appears on the organisation's page.
```

`source/working/history/2017-04-03-clearleft.md`: leave `end` out while it is still going.

```yaml
---
employer: clearleft        # leave this out when freelancing
role: Senior UX designer
end: 2024-03-28
summary: What the job was.
---
```

Optional `type:` is `employed` (the default when there is an employer), `freelance` (the default when there is none) or `contract`. `title:` overrides the generated "UX designer at Clearleft".

`source/working/2024-03-28-opa-winner.md`: leave `end` out while it is still going.

```yaml
---
title: Online Product Awards
engagement: clearleft      # the history file this happened during
client: waitrose           # leave out for in-house work with no client
end: 2025-01-31
sector: Retail             # optional: see below
featured: true             # optional: spotlight it
summary: One line for lists.
tags: [Research]
---
```

## What the site shows

| Need | Where |
| --- | --- |
| Spotlight: what I am working on now, and featured previous projects | `/working/` (first page). Current means no `end`. Featured means `featured: true` |
| All projects, with archives | `/working/`, `/working/2024/`, `/working/2024/03/` |
| Working history, with start to end and how long | `/working/history/` |
| Drop into one stretch, with its projects and who they were for | `/working/history/clearleft/` |
| Drop into an employer or client, with every project | `/working/organisations/clearleft/` |
| Browse by sector | `/working/sectors/` and `/working/sectors/retail/` |

Projects are also in `/feed.xml`, the `/everything-everywhere-all-at-once/` feeds, tags and the related-content component like any other root section.

## Sector or tags?

Both. Write `sector:` and it also counts as a tag, so `/tagging/retail/` finds the project next to your writing and links, and related content can see it. Keeping a separate `sector:` field means `/working/sectors/` lists only sectors, not every topic tag. A tag cannot tell you which of its values is a sector.

A project with no `sector` inherits its client's sectors, or its employer's if there is no client. Only a sector written on the project itself becomes a tag.

## When something is wrong

A file that points at nothing (a `client` with no organisation file, a project with no `engagement`) does not stop the build. It prints a `[working]` warning in the build log and the page shows what it can.

## Not decided yet

- A promotion at the same employer is two engagement files with the same `employer`. The history lists them separately. They could be grouped.
- Freelancing through an agency for an end client has nowhere to say who the intermediary was.
- A project that moves between engagements (agency, then freelance for the same client) is one project in one engagement, so it would need two files.
- Work under NDA, where the client should not be named.
- A controlled list of sectors, so "Retail" and "Retailing" are not two sectors.
- "1 year 3 months" is worked out at build time, so it only changes when the site is rebuilt.
