---
title: 'Tagging'
layout: 'layouts/feed.html'
pagination:
  data: collections
  size: 1
  alias: tag
  filter: ['attending', 'attended', 'working', 'writing', 'featuredWork', 'rss', 'tagsList', 'speaking', 'thoughts', 'making', 'cycles', 'lists', 'collecting', 'all', 'links']
permalink: '/tagging/{{ tag | slug }}/'
---