---
title: 'Lists'
layout: 'layouts/feed.html'
pagination:
  data: collections.lists
  size: 10
permalink: 'collecting/lists{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer'
paginationNextText: 'Older'
paginationAnchor: '#post-list'
---