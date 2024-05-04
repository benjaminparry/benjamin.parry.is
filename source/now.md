---
title: 'Now'
posse: 'A snapshot of what I’m doing now.'
layout: 'layouts/temp.html'
permalink: '/now/'
---

<div class="posse">{{ posse }}</div>

## Latest update – {{ now.now[0].date }}

### Work

{{ now.now[0].work }}

### Pleasure

{{ now.now[0].pleasure }}

### Culture

- TV and Films: [watching](/watching/#watching) {{ watchlist.watching[0].titleEnglish }}, [watched](/watching/#watched) {{ watchlist.watched[0].titleEnglish}}.
- Music: {{ playlist.playlist[0].titleEnglish }} by {{ playlist.playlist[0].artistEnglish }}.
- Books: [reading](/reading/#reading) {{ readlist.reading[0].titleEnglish }}, [read](/reading/#read) {{ readlist.read[0].titleEnglish }} by {{ readlist.read[0].author }}.

{% if now.was %}
## Was

An archive of my previous updates.

<ul class="list reset-list list--divided">
{% for was in now.was %}
<li style="padding: 0.75rem;">
{{ was.date }}

**Work:** {{ was.work }}


**Pleasure:** {{ was.pleasure}}
</li>
{% endfor %}
</ul>
{% endif %}