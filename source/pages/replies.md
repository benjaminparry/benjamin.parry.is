---
title: 'Replies'
layout: 'layouts/feed.html'
pagination:
  data: collections.replies
  size: 10
permalink: 'sending/replies{% if pagination.pageNumber > 0 %}/page/{{ pagination.pageNumber }}{% endif %}/index.html'
paginationPrevText: 'Newer »'
paginationNextText: '« Older'
paginationAnchor: '#post-list'
---