---
title: 'Focused'
summary: 'My list of bookmarks.'
layout: 'layouts/base.html'
permalink: '/focused/'
section:
    - utopia
---

A place for my regular visited websites and some meaningful distractions.

<ul class="reset-list">
    {%- for website in focused.websites -%}
    <li class="target"><a href="{{ website.url }}">{{ website.name }}</a></li>
    {% endfor %}
</ul>
