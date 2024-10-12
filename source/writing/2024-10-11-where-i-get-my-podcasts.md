---
title: "Where I get my podcasts"
posse: "My workflow to solve the lack of openly accessible podcast audio files and RSS feeds."
tags:
    - 'Open Source'
    - 'Self Hosting'
    - 'Podcasts'
---

I’ve recently got back into the habit of listening to podcasts.

As a kinaesthetic learner, I find the portable nature of audio content fits perfectly into my daily routine. Whether it be completing humdrum daily chores or traveling from A to B, I can use that time positively for learning. Also, my dyslexic brain can consume audio content much faster than it can written content.

Yet access to podcast audio files has become increasingly tedious of late. The once fertile and free-roaming lands of content have now been fenced off by a plethora of walled-garden digital land owners and content traps. Finding a mp3 file or RSS feed within the page source is so overly complicated it feels like trespassing.

Back in 2010 I signed up for Jeremy Keith’s [Huffduffer](https://huffduffer.com/): a service for finding, curating and consuming podcasts. If you’re unfamiliar with Huffduffer, here is how it works:

1. Visit a webpage for a podcast episode you want to listen to.
2. Add the episode to your feed by selecting the handy bookmarklet.
3. Huffduffer generates a unique podcast RSS feed in your account.
4. Subscribe to the feed in whatever app or service you choose to listen to it.

This feels more like content foraging.

Huffduffer doesn’t scrape the audio files from the original server and store a copy on huffduffer.com. That would be a waste of bandwidth and storage. Instead it provides a service between the countless podcasts available online and your preferred method of consuming them.

Its a great example of interoperability in action, benefiting both content creators (reach) and content consumers (freedom). Open web *for the win!*

But interoperability can’t work with closed systems. Apple podcasts, Spotify, Soundcloud, embedded javascript-based players intentionally obfuscate the mp3 file and fail to provide a RSS feed: locking in content creators and consumers within their platforms. Enshittification *ge’te’fuck!*

While it’s still possible to find mp3 files within the depths of the page source, it’s a laborious process that doesn’t always work. I’ve noticed Spotify seems to host a ~1 min mp3 file that is either a honeytrap or a slice of audio that is stitched together by the in-page player.

In the spirit of Solarpunk and tech re-adoption, I’ve experimented with using an old iPhone 4S as a dedicated audio player for podcasts, audiobooks and music. However the Apple Podcasts app, seemingly developed on an ancient Indian burial ground, was far too much trouble to persist with.

Luckily, for each intentionally exclusive technology built, there’s a developer determined to reverse-engineer a workaround.

Enter [PodGrab](https://github.com/akhilrex/podgrab): an open-source self-hosted service for downloading podcasts.

I’m a big fan of self-hosting. There’s a stack of Raspberry Pis plugged into my home network making life slightly better for my family and I; ad blocking (PiHole), home media centre (Jellyfin), network storage (Open Media Centre), file sharing (qbittorrent) and now telemetry-free podcast management (PodGrab).

I’m currently subscribed to about 20 podcasts via the in-built search. You can also directly subscribe to a RSS URL. I’ve done that for my Huffduffer RSS feed. This enables me to still collect individual podcast episodes without adding the full feed to PodGrab. This is useful when I’m not interested in the full podcast back catalogue but am for guest speaker or specific show topic.

This workflow works really well for me. Audio files are downloaded to a folder on my NAS which is also synced to Jellyfin. This means I can listen to episodes on Jellyfin at home or download them to a mobile device for on-the-go listening.

Syncing between these instances isn’t automatic but I quite like the manual step here. It forces me to reflect on what I’ve listened to. Manually combing through the content might result in a few actions; mark it as played, bookmark it for a re-listen, add it to the [links](/collecting/links) section of my website, share it with someone.

Earlier this year I also added [MeTube](https://github.com/alexta69/metube/) to the self-hosting stack. I was looking for a more intentional way of interacting with the content on YouTube. MeTube and its browser extension enables you to download YouTube content locally, away from the manipulative endless auto-play algorithm. Content is similarly downloaded and synced to Jellyfin, providing a customised feed of interesting and distraction-free content.

I recently discovered MeTube has an option for exporting video content as an audio file. Even better! There’s an option to specify a custom file path for these downloads which now in a directory alongside my podcasts.

I’m really happy with the results so far but I’d love to push this workflow further:

- Self-host an RSS or json feed of podcasts and import activity directly to my website.
- Sync between PodGrab and Jellyfin.
- Add unplayed/played metadata to audio files to make syncing to mobile devices easier.
- Auto generate transcripts using whisper.io for note-taking.