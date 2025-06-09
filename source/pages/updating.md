---
title: 'Updating'
layout: 'layouts/feed.html'
pagination:
  data: collections.updating
  size: 10
permalink: 'updating{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer'
paginationNextText: 'Older'
paginationAnchor: '#post-list'
---

A feed of recently updated pages.
