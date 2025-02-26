---
title: 'Everything Everywhere All At Once'
layout: 'layouts/temp.html'
permalink: '/everything-everywhere-all-at-once/'
section:
    - utopia
---

## Benjamin parry is…

- [Benjamin Parry](/benjamin-parry/) – More about me.
  - [User Manual](/benjamin-parry/user-manual) – A guide for working with me.
- [Contactable](/contactable/) - My contact details and how I prefer to converse.
- [Now](/now/) – What I’m up to right now: a status update.
- [Writing](/writing/) – Long form written content like articles and essays.
- [Speaking](/speaking/) – Links to podcasts and events I’ve spoken at.
- [Working](/working/) – What I’m working on now and past projects.
- [Making](/making/) – Things I’ve been making.
- [Tagging](/tagging/) – A taxonomy to help you find content you might be interested in.
- [Collecting](/collecting/) – The feed of things I collect that interest me, a mix of my own content and other people’s.
  - [Links](/collecting/links/) – Links or bookmarks that I find interesting.
  - [Thoughts](/collecting/thoughts/) – Thoughts or observations that end up shared on social media platforms.
  - [Cycles](/collecting/cycles/) – Documenting what is going on in my world, formally known as weeknotes.
  - [Lists](/collecting/lists/) – Lists of things, places and people.
  - [Ideas](/collecting/ideas/) – Ideas for things to me be made.
- [Sending](/sending) – Using webmentions to send content to other people’s websites… *yep websites can do that!*
  - [Likes](/sending/likes/) – Sending appreciation for those that deserve it.
  - [Replies](/sending/replies/) – Replying to content.
- [Celebrating](/celebrating/) – Marking special events in my career history.
- [Watching](/watching/) – Films, television, theatre I’ve watched or currently watching.
- [Listening](/listening/) – Music I’ve been listening to.
- [Reading](/reading/) – Books and manga I’ve read or currently reading.
- [Attending](/attending/) – Events I’m planning on attending or have attended.
- [Using](/using/) – The day-to-day objects I use.
- [Rejecting](/rejecting/) – Things I disapprove of.
- [Supporting](/supporting/) – Things I approve of.
- [Focused](/focused/) – My web browser homepage.
- Mirroring – A mirror of web important content to me and others. *(yet to be implemented)*
- [Offline](/offline/) – A list of pages stored locally when you are offline.
- [Everthing Everywhere All At Once](/everything-everywhere-all-at-once/) – This page, a sitemap of sorts.
  - [Chronologically](/everything-everywhere-all-at-once/chronologically/) – A chronological firehose of content posted to this website.

{% set postArchiveItems = collections.writing %}
## All of my writing ({{ postArchiveItems.length }})

{% include "partials/post-archive.html" %}

{% set postArchiveItems = collections.thoughts %}
## All of my thoughts ({{ postArchiveItems.length }})

{% include "partials/post-archive.html" %}
