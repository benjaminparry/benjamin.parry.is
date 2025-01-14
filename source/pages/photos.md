---
title: 'Photos'
layout: 'layouts/feed.html'
pagination:
  data: collections.photos
  size: 10
permalink: 'collecting/photos{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer'
paginationNextText: 'Older'
paginationAnchor: '#post-list'
---