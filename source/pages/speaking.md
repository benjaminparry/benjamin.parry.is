---
title: 'Speaking'
layout: 'layouts/feed.html'
pagination:
  data: collections.speaking
  size: 10
permalink: 'speaking{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer »'
paginationNextText: '« Older'
paginationAnchor: '#post-list'
---