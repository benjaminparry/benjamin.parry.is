---
title: 'Tagging'
layout: 'layouts/feed.html'
pagination:
  data: collections
  size: 1
  alias: tag
  filter: ['all', 'nav', 'writing', 'work', 'featuredWork', 'people', 'rss', 'thoughts']
permalink: '/tagging/{{ tag | slug }}/'
---