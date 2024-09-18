---
title: 'Everything Everywhere All At Once'
layout: 'layouts/temp.html'
permalink: '/everything-everywhere-all-at-once/'
---

## Benjamin parry is…

- [Benjamin Parry](/benjamin-parry/) – More about me.
- [Contactable](/contactable/) - My contact details and how I prefer to converse.
- [Now](/now/) – What I’m up to right now: a status update.
- [Writing](/writing/) – My written content.
- [Speaking](/speaking/) – Links to podcasts and events I’ve spoken at.
- [Working](/working/) – What I’m working on now and past projects.
- [Making](/making/) – Things I’ve been making.
- [Tagging](/tagging/) – A taxonomy to help you find content you might be interested in.
- [Collecting](/collecting/) – The feed of things I collet that interest me, a mix of my own content and other people’s.
  - [Links](/collecting/links/) – Links or bookmarks that I find interesting.
  - [Thoughts](/collecting/thoughts/) – Thoughts or observations that end up shared on social media platforms.
  - [Ideas](/collecting/ideas/) – Ideas for things to me be made.
  - Replies – Replies to content on other people’s websites… *yep websites can do that!*
- [Celebrating](/celebrating/) – Marking special events in my career history.
- [Watching](/watching/) – Films, television, theatre I’ve watched or currently watching.
- [Listening](/listening/) – Music I’ve been listening to.
- [Reading](/reading/) – Books and manga I’ve read or currently reading.
- [Attending](/attending/) – Events I’m planning on attending or have attended.
- [Using](/using/) – The day-to-day objects I use.
- [Rejecting](/rejecting/) – Things I disapprove of.
- [Supporting](/supporting/) – Things I approve of.
- [Focused](/focused/) – Positive distraction websites to visit.
- Mirroring – A mirror of web important content to me and others. *(yet to be implemented)*
- [Offline](/offline/) – A list of pages stored locally when you are offline. *(may be broken… 😬)*

{% set postArchiveItems = collections.writing %}
## All of my writing ({{ postArchiveItems.length }})

{% include "partials/post-archive.html" %}

{% set postArchiveItems = collections.thoughts %}
## All of my thoughts ({{ postArchiveItems.length }})

{% include "partials/post-archive.html" %}