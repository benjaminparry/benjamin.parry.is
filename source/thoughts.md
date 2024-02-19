---
title: 'Thoughts'
layout: 'layouts/feed.html'
pagination:
  data: collections.thoughts
  size: 10
permalink: 'collecting/thoughts{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer'
paginationNextText: 'Older'
paginationAnchor: '#post-list'
---

