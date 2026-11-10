# Webmentions

How this site sends and receives [webmentions](https://indieweb.org/Webmention), and what you need to set up outside the repository.

Nothing here runs in a visitor's browser. The site is static, so:

- **Receiving:** every time Netlify builds the site it asks webmention.io for the latest mentions and writes them into the HTML.
- **Sending:** after every successful deploy, Netlify tells webmention.app to read the site's feed and send mentions for the links in the newest posts.

```
 someone mentions you ──► webmention.io ──► (webhook) ──► Netlify build hook ──► build ──► mentions in the HTML
                                                                                    │
 you publish a post ───────────────────────────────────────────────────────► deploy succeeds
                                                                                    │
                       the other site ◄── webmention.app ◄── (outgoing webhook) ◄───┘
```

## What is in the repository

| What | Where |
| --- | --- |
| Where mentions are sent to (`rel="webmention"`), your `rel="me"` profiles and the feed link | `source/_includes/layouts/base.html`, values in `source/_data/site.js` |
| Fetching incoming mentions on every build | `source/_data/webmentions.js`, `_config/webmentions.js` |
| Showing mentions on a page | `source/_includes/macros/webmentions.html`, `source/_includes/partials/webmentions.html` |
| Likes and replies you send | `source/sending/` (posts), `_config/sending.js`, `source/_includes/layouts/sending-post.html` |
| Feeds webmention.app reads | `source/feed.njk` (`/feed.xml`, everything), `source/sending/feed.njk` (`/sending/feed.xml`), `source/_includes/partials/atom-feed.njk` |
| Microformats (`h-entry`, `h-card`) on every post layout | `source/_includes/partials/h-entry-meta.html` and the post layouts |
| Netlify build settings | `netlify.toml` |

---

## One-time setup

You do these once, in this order. Each step says where to click. Netlify and the other dashboards rename their menus now and then, so if a name doesn't match, look for the closest one.

### 1. Receiving: webmention.io

1. **Make your profiles link both ways.** webmention.io signs you in by checking that your site links to a profile *and that profile links back*. The site already has `<link rel="me">` for the profiles in `source/_data/site.js` (`me`). So:
   - GitHub: profile → **Website** must be `https://benjamin.parry.is`.
   - Mastodon: profile → **Edit profile → Extra fields** → add `https://benjamin.parry.is` (it shows a green tick once it has found the `rel="me"` link).
   - Using a different profile? Add its address to `me` in `source/_data/site.js` and deploy first.
2. **Sign in** at <https://webmention.io> and enter your site address (`benjamin.parry.is`). Choose the profile you linked in step 1.
3. **Check your username.** The endpoint is `https://webmention.io/<username>/webmention`. The site is set up for `benjamin.parry.is`. If webmention.io gave you something else, change `webmention` in `source/_data/site.js` (`domain`, `endpoint`, `pingback`).
4. **Add the site**, if it isn't listed, at <https://webmention.io/settings/sites>.
5. **Copy your API key** from <https://webmention.io/settings>. This is a secret: it lets anyone read your mentions, including private ones.
6. **Give it to Netlify.** In Netlify: **Site configuration → Environment variables → Add a variable**
   - Key: `WEBMENTION_IO_TOKEN`
   - Value: the API key
   - Scopes: **Builds** (it is only needed while building). Mark it as secret if Netlify offers that.
7. **Rebuild when a mention arrives.** The site only changes when it is built, so tell Netlify to build when webmention.io gets a mention.
   1. Netlify: **Site configuration → Build & deploy → Build hooks → Add build hook**. Name it `webmention.io` and pick your production branch. Copy the URL (it works like a password).
   2. webmention.io: **Settings → Sites →** your site → paste that URL as the **webhook** address and save. webmention.io then sends a request to it for every new, verified mention.

   > Every mention (and every deleted mention) now starts a full build, which counts against your Netlify plan. If that is too many, skip the webhook and instead call the same build hook on a schedule (for example once a day from a GitHub Actions `schedule:` workflow, or a free cron service). New mentions then appear within a day instead of within minutes.

### 2. Sending: webmention.app

webmention.app reads a feed, finds the newest posts, finds the links inside them and sends a webmention for each. It only sends: it does not receive.

1. **Get a token** at <https://webmention.app/token>. Without one, requests are limited to one per four hours for each address.
2. **Try it without sending anything.** Opening an address with a normal browser request (a `GET`) is a *dry run*: it shows who would be notified and notifies nobody. Once the site is deployed with the feed:

   ```sh
   curl "https://webmention.app/check?token=YOUR_TOKEN&limit=3&url=https://benjamin.parry.is/feed.xml"
   ```

   You should see a list with the `source` (your post), the `target` (the page it links to) and the `endpoint` that would receive it. A `POST` to the same address actually sends.
3. **Send after every deploy.** In Netlify: **Site configuration → Build & deploy → Deploy notifications → Add notification → Outgoing webhook**
   - Event: **Deploy succeeded**
   - URL to notify:

     ```
     https://webmention.app/check?token=YOUR_TOKEN&limit=3&url=https://benjamin.parry.is/feed.xml
     ```

   - If Netlify offers a branch or deploy context choice, pick your **production** branch, so deploy previews don't trigger it.

   **Why `limit=3`.** webmention.app looks at the newest items in the feed (10 by default) on every request, and its documentation doesn't describe it remembering what it has already sent, so assume it doesn't. Sending the same mention again is harmless (the receiving site treats it as an update), but a small limit keeps it quiet. It is also why a deploy that was started by an incoming mention doesn't re-notify a lot of sites. Don't use `limit=0`: that processes the whole feed on every deploy. If you sometimes publish more than three things between deploys, raise it, or add a second notification for `https://benjamin.parry.is/sending/feed.xml` with `limit=10`.

   **Why after the deploy, not during the build.** The other site checks that your post really links to it, by fetching your post. During a build the new post isn't live yet, so it would fail. "Deploy succeeded" runs once the post is online.

### 3. Check it works

1. **Receive:** open <https://webmention.rocks> (a set of test pages). Send a test mention to one of your posts, or ask someone who has webmentions to link to a post. Check it appears in the webmention.io dashboard.
2. **Rebuild** (or wait for the webhook). Open the post: you should see a **Webmentions (n)** section.
3. **Send:** publish a like or reply (below), deploy, then look at the deploy log in Netlify for the notification, or run the dry run again. If the other site supports webmentions, your like or reply shows up there after a few minutes.

---

## Day to day

### Publishing a like or reply

Add a Markdown file to `source/sending/likes/` or `source/sending/replies/`. You don't need a title: one is made for you ("Liked a post by Jeremy Keith", "Replied to adactio.com").

```yaml
# source/sending/likes/2026-10-25-like_20261025101500.md
---
date: 2026-10-25T10:15:00Z        # the exact time: it makes the address and the order
likeOf: https://adactio.com/journal/21552
author: Jeremy Keith              # who wrote the page you liked (optional)
tags:
  - AI
---
Optional note, shown with the like.
```

```yaml
# source/sending/replies/2026-10-25-reply_20261025101500.md
---
date: 2026-10-25T10:15:00Z
inReplyTo: https://adactio.com/journal/21656
---
Your reply. Links in here also get a webmention.
```

- The address is `/sending/likes/2026/10/like_20261025101500/` (replies: `/sending/replies/2026/10/reply_20261025101500/`). It is built from `date` in UTC, **not from the file name**, so `date` must be right and include the time. Two posts in the same second would clash.
- Other keys the layout understands: `title`, `summary`, `category`, `tags`, `syndication` (a list of copies on other sites, such as a Mastodon post), `repostOf`, `bookmarkOf`.
- `likeOf`, `inReplyTo` (and `repostOf`, `bookmarkOf`) must be a full address starting with `https://`. The link to it is written with the right microformat class (`u-like-of`, `u-in-reply-to` …), and the same link is repeated inside the feed entry, which is what webmention.app uses to know who to notify.

`/sending/` lists likes and replies together, `/sending/likes/` and `/sending/replies/` list one kind, and `/sending/feed.xml` is the feed.

### Webmentions on a page or section

Mentions are switched on with `showWebmentions: true`, which is already set for:

- all of `writing`
- `collecting/cycles` and `collecting/thoughts`
- everything in `sending`

**Turn on for another section:** add `"showWebmentions": true` to its data file, for example `source/collecting/links/links.json`.

**Turn off for one post:** put `showWebmentions: false` in that post's front matter.

**Turn on for a single post** in a section that hasn't got it: `showWebmentions: true`.

**In any layout or page**, you can also call the macro directly, in the place you want it:

```njk
{% from "macros/webmentions.html" import mentions %}
{{ mentions(webmentions, page) }}
{{ mentions(webmentions, page, { "types": ["in-reply-to", "mention-of"], "heading": "Replies" }) }}
```

| Option | What it does |
| --- | --- |
| `heading` | Heading text. Default `Webmentions`. `""` hides it. |
| `types` | Only these kinds: `like-of`, `in-reply-to`, `repost-of`, `mention-of`, `bookmark-of`, `rsvp`. Default: all. |
| `aliases` | Other addresses the page has had, e.g. `["/old/address/"]`. Mentions of those count too. |
| `showContent` | `false` hides the text of replies and mentions. |
| `showEmpty` | `true` shows the section even when there are no mentions. |

To set options for a whole folder or one post, use front matter: `webmentionOptions: { types: [in-reply-to, mention-of] }`.

Each mention shows who sent it, when it was published (or received, if the sender gives no date), a link to the mention, and the text of replies. The section heading has the total, and below it a breakdown ("2 likes, 1 reply").

### Adding another kind of post to Sending

For example reposts or bookmarks (the layout already handles `repostOf` and `bookmarkOf`):

1. Add a line to `sections` in `_config/sending.js`: `{ slug: "reposts", title: "Reposts", kind: "repost" }`.
2. Copy `source/sending/likes/` to `source/sending/reposts/`, rename `likes.11tydata.js` to `reposts.11tydata.js`, and change the slug it looks up. In `index.html`, change `collections.sendingLikes` to `collections.sendingReposts`, and the headings and `sendingNav(sendingSections, "reposts")`.
3. Add the page to the navigation in `source/_data/navigation.json`.

The collection, tags, year and month archives, feeds and the webmention.app feed pick it up on their own.

---

## The site-wide feeds

Two feeds cover every post in every collection (writing, collecting, the root collections, sending, watching, reading, playing, listening). Each has a paginated page (20 per page) and an Atom feed with the newest 25 entries, so either feed can be the one webmention.app reads.

| What | Page | Feed |
| --- | --- | --- |
| Newest first, by each post's own date | `/everything-everywhere-all-at-once/chronologically/` | `/everything-everywhere-all-at-once/chronologically/feed.xml` |
| Most recently updated first | `/everything-everywhere-all-at-once/updated/` | `/everything-everywhere-all-at-once/updated/feed.xml` |

The updated feed only lists posts that have an `updated:` value. Each entry is dated by its latest update and lists every update with its comment. `updated` can be written any of these ways:

```yaml
updated: 2025-01-07                  # one date
updated: [2025-01-07, 2025-03-02]    # several dates
updated:                             # dates with comments ("note" works too)
  - date: 2025-03-02
    comment: Added the second half
  - date: 2025-01-07
    comment: Fixed a typo
updated:                             # short form: date, then comment
  - 2025-03-02: Added the second half
```

Dates that can't be read (and bare numbers such as `updated: 2025`) are ignored. If you point webmention.app at the updated feed, an edited post moves to the top of it and its links are checked again; webmention.app only sends for entries it hasn't already sent, so use `limit=3` as in the setup above.

Each feed template declares `eleventyImport: collections: [...]` in its front matter. Without it, Eleventy can render a feed before the posts it lists and fails with "Tried to use templateContent too early". Any new feed template needs the same line.

The code is in `_config/updated.js`, `source/_includes/macros/everything.html` and `source/everything-everywhere-all-at-once/`.

## Choices that were made

**Receiving.** The mentions are fetched during the build and written into the page. No script runs for the reader. Alternatives: webmention.io's own embed script (needs JavaScript in the browser); committing the mentions into the repository with a scheduled GitHub Action (more moving parts for the same result).

- Private mentions are never published. The token lets webmention.io return them, so they are dropped as soon as they are fetched.
- A mention can come from anyone, so only `http(s)` links are ever linked to, text is escaped, and links to senders are `rel="nofollow ugc"`.
- A build never fails because of webmentions. If webmention.io can't be reached, or there is no token, the last saved copy in `.cache/` is used (or none).
- On Netlify every build fetches fresh. On your own computer, `npm start` reuses the last copy for 10 minutes.

**Sending.** webmention.app is called by a Netlify webhook after the deploy. Alternatives that were not used:

- Running `@remy/webmention` as a `postbuild` script (webmention.app's own example): it runs before the new pages are online, so the receiver can't verify them.
- A Netlify function triggered by deploys: works, but it is code to write and look after for what the webhook already does.
- Bridgy: useful for turning social replies *into* webmentions and for posting to Mastodon or Bluesky, but not needed for this.

**Feeds.** `/feed.xml` is an Atom feed of everything with a date of its own (writing, collecting, sending, speaking and the other root collections). Each like and reply puts the link it is about at the start of its entry. The 25 newest entries are included.

## When something doesn't work

| What you see | Try |
| --- | --- |
| No mentions on a page, but they are in the webmention.io dashboard | Is `WEBMENTION_IO_TOKEN` set for **Builds** in Netlify? The deploy log says `[webmentions] fetched n from webmention.io`, or why it didn't. Was it built since the mention arrived? |
| Mentions show on some posts, not others | The mention must be for the post's address. `http` vs `https`, `www`, a trailing slash or `#fragment` don't matter, but a different address (an old one) does: use `aliases`. |
| The log says it could not fetch | Wrong API key, or webmention.io is down. The last saved copy is used. |
| A mention should have been sent but wasn't | Run the dry run. Is the post in the newest `limit` entries of `/feed.xml`? Does its content link to the target? Does the target site advertise a webmention endpoint? |
| webmention.app answers with a rate limit | Add `token=` to the address. |
| It is sending for deploy previews | Restrict the Netlify notification to your production branch. |
| webmention.io won't sign you in | The profile must link to `https://benjamin.parry.is` *and* the site must link to the profile with `rel="me"` (check the page source). |
| Netlify build hook doesn't start a build | Open the hook URL in the webmention.io settings and check it is the one Netlify shows. Look in Netlify's deploy list for "Triggered via build hook". |

## Sources

- [Webmention (IndieWeb)](https://indieweb.org/Webmention)
- [webmention.io](https://webmention.io/) and its [API](https://webmention.io/api)
- [webmention.app](https://webmention.app/docs) (`/check?url=`, `limit`, `token`, Netlify "Deploy succeeded" webhook)
- [Webmentions with Eleventy: step by step (Reilly Spitzfaden)](https://reillyspitzfaden.com/wiki/tutorials/webmention-tutorial/)
- [webmention.rocks](https://webmention.rocks) for testing
