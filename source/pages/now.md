---
title: 'Now'
posse: 'A snapshot of what I’m doing now. Part of the NowNowNow group https://nownownow.com/about.'
layout: 'layouts/temp.html'
permalink: '/now/'
section:
    - utopia
---

<div class="posse">{{ posse }}</div>

## Latest update – {{ now.now[0].date }}

### Work

{{ now.now[0].work }}

### Pleasure

{{ now.now[0].pleasure }}

### Most recent content

- I wrote [{{ collections.writing[0].data.title }}]({{ collections.writing[0].url }})
- I made [{{ collections.making[0].data.title }}]({{ collections.making[0].url }})
- Thought collected [{{ collections.thoughts[0].data.title }}]({{ collections.thoughts[0].url }})
- Link collected [{{ collections.links[0].data.title }}]({{ collections.links[0].url }}) by {{ collections.links[0].data.author }}

### Culture

- I’m reading [{{ readlist.reading[0].titleEnglish }}](/reading/#reading) by {{ readlist.reading[0].author }} *and {{ readlist.reading.length - 1 }} other books*.
- I’m watching [{{ watchlist.watching[0].titleEnglish }}](/watching/#watching) *and {{ watchlist.watching.length - 1 }} other shows*.
- I’m listening to [{{ playlist.playlist[0].titleEnglish }}](/listening/) by {{ playlist.playlist[0].artistEnglish }} *{{ playlist.playlist[0].status }} ({{ playlist.playlist[0].rating }}/5)*
- I read [{{ readlist.read[0].titleEnglish }}](/reading/#read) by {{ readlist.read[0].author }} *({{ readlist.read[0].rating }}/5)*.
- I watched [{{ watchlist.watched[0].titleEnglish}}](/watching/#watched) *({{ watchlist.watched[0].rating}}/5)*


{% if now.was.length %}
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