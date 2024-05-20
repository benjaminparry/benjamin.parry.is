---
metaDesc: 'Personal website of Benjamin Parry'
layout: 'layouts/home.html'
title: 'Website homepage'
---

<article class="vcard h-card">

  <h1 class="heading heading--alpha"><span class="heading__utility utility-font-size-200">I’m <strong>curious</strong>.</span></h1>

  <figure class="reset-figure card card--profile">
      <div class="reset-line-height">
        <img src="/assets/images/profile/benjamin-parry.jpg" alt="A white male with dark cropped hair wearing a blue shirt smiling and looking off to the left." class="u-photo card__image">
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

  I’m interested in **the environment**, **people** and **technology**. When these things work together, in that order of preference, I believe we can positive change.

  I use this website for [writing](/writing/) longform posts, [collecting](/collecting) [links](/collecting/links/) and [thoughts](/collecting/thoughts).

  Most recently I;

  - wrote [{{ collections.writing[0].data.title }}]({{ collections.writing[0].url }}),
  - made [{{ collections.making[0].data.title }}]({{ collections.making[0].url }}),
  - collected my thoughts about [{{ collections.thoughts[0].data.title }}]({{ collections.thoughts[0].url }}),
  - and collected an interesting link about [{{ collections.links[0].data.title }}]({{ collections.links[0].url }}).

  <!-- {% include "partials/data-cascade.html" %} -->

</article>
