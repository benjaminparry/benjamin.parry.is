---
title: 'Podcasts'
layout: 'layouts/feed.html'
pagination:
  data: collections.podcasts
  size: 10
permalink: 'collecting/podcasts{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer'
paginationNextText: 'Older'
paginationAnchor: '#post-list'
---

Custom feed of poscasts. Subscribe to the podcasts [RSS feed](/collecting/podcasts/feed.xml).
