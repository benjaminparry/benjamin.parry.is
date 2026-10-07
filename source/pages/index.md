---
layout: 'layouts/extend-base-example.html'
title: 'Hello, world'
summary: 'A short summary of text to explain the content.'
nested:
  sample: 'nested data one'
images:
  primary:
    source: '/assets/images/colophon/colophon.webp'
    description: 'Image of a nice rabbit'
    alternative: true
---

# Koh

{{ title }}

{{ nested.sample }}

{% include "partials/navigation.html" %}
