---
title: 'Cycles'
layout: 'layouts/feed.html'
pagination:
  data: collections.cycles
  size: 10
permalink: 'collecting/cycles{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer'
paginationNextText: 'Older'
paginationAnchor: '#post-list'
---