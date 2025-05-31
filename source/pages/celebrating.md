---
title: 'Celebrating'
layout: 'layouts/feed.html'
pagination:
  data: collections.celebrations
  size: 10
permalink: 'celebrating{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer'
paginationNextText: 'Older'
paginationAnchor: '#post-list'
---

A page for celebrating the good things.
