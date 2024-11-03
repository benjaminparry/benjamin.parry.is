---
title: "There will be bugs"
posse: "I rebuilt my old Jekyll website using Eleventy."
tags:
    - 'Indieweb'
    - 'Eleventy'
    - 'Static Site Generator'
topic: 'technology'
---

If you’re reading this, you’re on my rebuilt website. Huzzah!

Rebuilding this thing has been on my list for ages. Back in 2013 I moved [from Octopress to Jekyll](/writing/2013/02/ground-zero/), I’m now using the static site generator [Eleventy](https://www.11ty.dev/). I suspect in a few years I’ll write a similar post announcing a shift from Eleventy to Blapp or whatever the next new hot build tool might be.

I want to give a huge shout out to Andy Bell for his [Learn Eleventy From Scratch](https://learneleventyfromscratch.com/) (LEFS) resource. Published in 2020 it holds up really well technically. I only had a few issues with Gulp during build and a deprecated library when I tried to deploy it on Netlify a few mins ago. In both cases I was able to find a fix, in my case delete what I didn’t actually need. Technicals aside, the content is written and broken down so well. Andy has a real knack for guiding you step by step, using simple language and easy to understand examples. The challenge I often have with these kind of resources is that they cover content that’s so divorced from the goals of your own project. Not with LEFS. No, siree Bob! I could draw enough from the content to replicate my existing site and build out many new sections. I’ve been throwing him gratitude on the socials leading up to the festive holidays but I want to use this opportunity to give him a big high 5. Cheers Andy!

## What’s next?

Ever since I heard about [POSSE](https://indieweb.org/POSSE) I’ve been gagging to get it working on this site. I’ve been going through the motions by occasionally using [Bridgy](https://brid.gy/about) and adding twoof-ready `posse:` descriptions to the frontmatter of all my posts. Now we’re officially rebuilt and deployed I’m going to start looking into Paul Robert Lloyd’s [Indiekit](https://getindiekit.com/).

I’d also like to get a solution for images. Currently it’s a manual process and there’s likely a much better way to include, render, host and serve.

I suppose before that I should do a bit, or a lot, of refactoring. Some of the shocking code I threw together in my haste to get it launched will need attention sooner rather than later. For example the data cascade penny dropped on the same day I deployed it so there’s no doubt lots to improve and abstract. I should validate the HTML to make sure it’s valid and accessible, I probably skipped or lost some of Andy’s great markup suggestions in translation of my old templates. Not to mention the bugs I’ve overlooked, if you spot anything that’s out of place or a 404 please feel free to [bloop me](https://mastodon.social/@benjaminparry).

Lastly I’ll probably take a look at the design in general. Hearing so people rave about [Utopia](https://utopia.fyi/) for so long I think it’s about time I give it a shot. I’ve never ‘got’ Typography so now is the time to start.

The whole process of rebuilding the site has been really fun and rewarding. But not only that. It’s been gratifying to reflect on nine years of [writing](/writing/) posts, [collecting](/collecting/) [thoughts](/collecting/thoughts/) and [links](/collecting/links/), and [tagging](/tagging/) content. I’m really excited to now have a place to document what I’ve been [working](/working/) on and [making](/making/).