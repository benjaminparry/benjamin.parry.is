---
title: 'Making Mistakes'
permalink: '/making/mistakes/'
layout: 'layouts/temp.html'
section:
    - utopia
---

A list of mistakes I’ve made maintaining this site and the reasoning behind making the changes to rectify them.

## Moving Pages

One problem with the evolution of a blog is the temptation to change it. One thing I’ve tried to commit to from the start is a single url design but recently I’ve changed my mind and broken a few things. The reasons vary; scaling the site’s content, changes in build tool version and functionality, better url design UX and falling victim to good ol’ indecisiveness.

## A general lack of publish date url design

Jekyll offers date url design out of the box. Posts are built into a directory structure yy/mm/dd enabling a more date hackable url design. Compare this of my current writing design `writing/ground-zero/` vs `writing/2013/02/16/ground-zero`, the latter purveying date relevance from the url. Since then I’ve omitted the dd from the URL design I’m less likely to produce a large amount of content in a single day so setting sublevel at the month seemed more sensible.

There is also the issue of repeated entry titles e.g. `writing/ground-zero/` written in 2016. Moving to the afforementioned design would also enable me to archive less relevant content as and when it’s needed.

### Lessons learned

* URL design precedes the initial commit
* Map out the design with real content
* Experiment with the language
* Be consistent
* If it feels boated or clunky, you’ve probably made a mistake
* Abstract it
* Think [future friendly](https://futurefriendlyweb.com/)
