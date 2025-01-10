---
title: 'Likes'
layout: 'layouts/feed.html'
pagination:
  data: collections.likes
  size: 10
permalink: 'sending/likes{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer »'
paginationNextText: '« Older'
paginationAnchor: '#post-list'
---