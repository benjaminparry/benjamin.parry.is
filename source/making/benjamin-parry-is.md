---
title: 'benjamin.parry.is – Colophon'
tags:
  - 'Indieweb'
  - 'Eleventy'
posse: 'I made this website. This is the Colophon.'
date: '2024-01-02'
link1:
  ulr: 'dffaddfas'
  cta: 'dfadsfdfsa'
link2:
  ulr: 'fas'
  cta: 'dfadsasdfadsfdfsa'
  class:
    - 'heading'
---

## What I use

- Generating with [Eleventy](https://www.11ty.dev/)
- Controlling versions with [Github](https://github.com/)
- Publishing and syndicating with:
    - [Indiekit](https://getindiekit.com/)
    - [Railway.app](https://railway.app/)
    - [EchoFeed](https://echofeed.app)
- Webmentioning with:
    - [Bridgy](https://brid.gy/)
    - [Webmention.app](https://webmention.app/)
    - [Webmention.io](https://webmention.io/)
- Deploying with [Netlify](https://www.netlify.com/)
- Setting type with [Utopia](https://utopia.fyi/)
- Designing in the browser with [Firefox](https://www.mozilla.org/en-GB/firefox/)

## Credit where credit is due

I used [Andy Bell](https://andy-bell.co.uk/)’s excellent resource [Learn Eleventy From Scratch](https://learneleventyfromscratch.com/) to help me get started.

---

## Styleguide

### Headings

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

### Paragraphs

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Paupertas si malum est, mendicus beatus esse nemo potest, quamvis sit sapiens. Sed quanta sit alias, nunc tantum possitne esse tanta. Sed vos squalidius, illorum vides quam niteat oratio. Non igitur de improbo, sed de callido improbo quaerimus, qualis Q. Nunc ita separantur, ut disiuncta sint, quo nihil potest esse perversius. Duo Reges: constructio interrete.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Scripta sane et multa et polita, sed nescio quo pacto auctoritatem oratio non habet. Habes, inquam, Cato, formam eorum, de quibus loquor, philosophorum. Tum mihi Piso: Quid ergo? Non autem hoc: igitur ne illud quidem. Istam voluptatem, inquit, Epicurus ignorat? At ille non pertimuit saneque fidenter: Istis quidem ipsis verbis, inquit; Quae ista amicitia est? Duo Reges: constructio interrete. Itaque fecimus.

### Lists

1. Ichi
2. Ni
3. San
4. Shi
5. Yon

- Macro
  - Meso
    - Micro

### Links

{% set anchorCustom = link1 %}
{% include "partials/link.html" %}

{% set anchorCustom = link2 %}
{% include "partials/link.html" %}

### Quotes

> Every day, once a day, give yourself a present. Don't plan it. Don't wait for it. Just let it happen: It could be a new shirt at the men's store, a catnap in your office chair, or two cups of good, hot black coffee.
> – Agent Cooper, Twin Peaks

### Emphasis

- Not important, but still important
- *Actually important*
- **Really important**
- ***Really, really important***

### Images

![A fluffy bunny rabbit](/assets/images/colophon/colophon.jpg)

### Video

<div class="embed-wrapper">
<iframe src="https://www.youtube-nocookie.com/embed/6vib77CUxNM?si=EStChuRfmAIXFMEw&amp;controls=0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

### Code

`Kill all humans!`

`` `Kill all humans!` ``