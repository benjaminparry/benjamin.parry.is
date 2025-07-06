---
title: 'Watchings'
posse: 'My TV and film watchlist.'
layout: 'layouts/watchlist.html'
pagination:
  data: collections.watchlist
  size: 10
permalink: 'watching{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer'
paginationNextText: 'Older'
paginationAnchor: '#post-list'
---

{{ posse }}
