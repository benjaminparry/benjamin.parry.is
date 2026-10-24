---
title: 'Contact me'
layout: 'layouts/base.html'
permalink: '/contactable/'
---

Add me as a contact by downloading my [vCard, 0.000459MB](/assets/other/benjamin-parry.vcf)

## Elsewhere

I’m also available at these digital islands:

<ul>
{% for item in navigation.elsewhere %}
<li><a href="{{ item.url }}" rel="me">{{ item.label }}</a></li>
{% endfor %}
</ul>
