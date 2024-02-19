---
title: 'Making'
layout: 'layouts/feed.html'
pagination:
  data: collections.making
  size: 10
permalink: 'making{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer'
paginationNextText: 'Older'
paginationAnchor: '#post-list'
---

I’m also making [mistakes](/making/mistakes/).