---
title: 'Now'
posse: 'A snapshot of what I’m doing now. Part of the NowNowNow group https://nownownow.com/about.'
layout: 'layouts/temp.html'
permalink: '/now/'
section:
    - utopia
---

<div class="posse">{{ posse }}</div>

## {{ collections.now[0].data.title }}

{{ collections.now[0].content | safe }}

### Most recent content

- I wrote [{{ collections.writing[0].data.title }}]({{ collections.writing[0].url }})
- I made [{{ collections.making[0].data.title }}]({{ collections.making[0].url }})
- Thought collected [{{ collections.thoughts[0].data.title }}]({{ collections.thoughts[0].url }})
- Link collected [{{ collections.links[0].data.title }}]({{ collections.links[0].url }}) by {{ collections.links[0].data.author }}
- Podcast collected [{{ collections.podcasts[0].data.title }}]({{ collections.podcasts[0].url }})

### Culture

- I’m reading [{{ readlist.reading[0].titleEnglish }}](/reading/#reading) by {{ readlist.reading[0].author }} *and {{ readlist.reading.length - 1 }} other books*.
- I’m listening to [{{ playlist.playlist[0].titleEnglish }}](/listening/) by {{ playlist.playlist[0].artistEnglish }} *{{ playlist.playlist[0].status }} ({{ playlist.playlist[0].rating }}/5)*
- I read [{{ readlist.read[0].titleEnglish }}](/reading/#read) by {{ readlist.read[0].author }} *({{ readlist.read[0].rating }}/5)*.
- I watched [{{ collections.watchlist[0].data.title }}]({{ collections.watchlist[0].url}}) ({{ collections.watchlist[0].data.rating_emoji}})



## Was

An archive of all of my Now updates.

<ul class="list reset-list list--divided">
{% for was in collections.now %}

* [{{ was.page.fileSlug }}]({{was.url}}): {{ was.data.posse }}

{% endfor %}
</ul>
