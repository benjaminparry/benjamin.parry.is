---
metaDesc: 'Personal website of Benjamin Parry'
layout: 'layouts/home.html'
title: 'Website homepage'
---

<article class="vcard h-card">

  <h1 class="heading heading--alpha"><span class="heading__utility utility-font-size-200">I’m <strong>curious</strong>.</span></h1>

  <figure class="reset-figure card card--profile">
      <div class="reset-line-height">
        <img src="/assets/images/profile/benjamin-parry.jpg" alt="Image of Benjamin Parry" class="u-photo card__image">
      </div>
      <figcaption class="reset-figcaption card__text">
        <p class="reset-heading card__text__heading p-name">Benjamin Parry</p>
        <p class="card__text__description">Design Researcher</p>
      </figcaption>
  </figure>

  <p class="p-note utility-font-size-120">Hi, I’m <strong><a href="/benjamin-parry" class="url u-url" rel="me">Benjamin Parry</a></strong>.</p>

  I’m a **{{ about.role }}** {{ about.location }}.

  I’ve been working in the design and web space since 2009. My journey began as a front-end developer, gradually moving into UI and UX design before **specialising in design research** in 2017.

  Since then I have gained **{{ about.experience }}** of **{{ about.activitites }}**.

  I use this website for [writing](/writing/) longform posts, [collecting](/collecting) [links](/collecting/links/) and [thoughts](/collecting/thoughts).

  I’m also available at these digital islands:

  {% include "partials/elsewhere.html" %}
  <!-- {% include "partials/data-cascade.html" %} -->

</article>
