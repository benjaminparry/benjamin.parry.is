---
title: 'Playing'
layout: 'layouts/playing.html'
pagination:
  data: collections.playing
  size: 10
permalink: 'playing{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer'
paginationNextText: 'Older'
paginationAnchor: '#post-list'
---
