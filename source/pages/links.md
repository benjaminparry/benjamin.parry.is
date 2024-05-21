---
title: 'Links'
layout: 'layouts/feed.html'
pagination:
  data: collections.links
  size: 10
permalink: 'collecting/links{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer'
paginationNextText: 'Older'
paginationAnchor: '#post-list'
---
