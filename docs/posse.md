# POSSE: Publish (on your) Own Site, Syndicate Elsewhere

Write a post here, and a copy goes out to Mastodon, Bluesky and LinkedIn with a link back. The address of each copy is saved into the post's front matter as `syndication:`, which your pages already show as `rel="syndication"` links. <https://indieweb.org/POSSE>

## How it works

```
you merge to main ─► Netlify deploys ─► /posse.json lists posts with `syndicate:`
                                              │
          every 30 minutes (or "Run workflow") ▼
                         GitHub Action: node scripts/posse.mjs --post
                                              │  sends each post to each network it asked for
                                              ▼
                  commits `syndication:` links back to main ─► Netlify deploys again
```

| Piece | Where |
| --- | --- |
| Settings | `source/_data/posse.js` |
| The list of posts that want sending | `source/posse.json.njk` (published at `/posse.json`) |
| What to send, and the front matter edit | `_config/posse.js` |
| The three networks | `_config/posse-networks.js` |
| The command | `scripts/posse.mjs` (`npm run posse`) |
| The schedule | `.github/workflows/posse.yml` |
| LinkedIn sign-in helper | `scripts/posse-linkedin-auth.mjs` |
| Tests | `scripts/posse-test.mjs` |

## Sending a post

Add `syndicate` to its front matter:

```yaml
syndicate: true                    # every network that is switched on
syndicate: [mastodon, bluesky]     # or just these
syndicate: false                   # or leave it out: nothing is sent
syndicateText: "Written just for the social post."   # optional: replaces the title and summary
```

You can set it for a whole folder in its data file (`thoughts.json`: `"syndicate": ["mastodon", "bluesky"]`). Posts are only sent once they are live on the site, and only if all of these are true:

- the post asked for the network,
- it isn't already there (a link to that network is in `syndication`, so your older posts that you posted by hand are left alone),
- it is newer than `maxAgeDays` (7 by default, so switching this on can't flood your timelines; `--allow-old` overrides it for one run),
- it isn't a draft (drafts are never built, so they are never in the list).

Editing a post later does **not** change the copies, and nothing is sent twice.

## What gets sent

| Network | Words | Card and picture |
| --- | --- | --- |
| Mastodon | Title, summary and link, up to 500 characters (a link counts as 23) | Mastodon makes the card from your page's social tags (`partials/social-meta.html`) |
| Bluesky | Title, summary and link, up to 300 characters | A link card with the title, summary and picture, made here. The picture must be under about 950 KB |
| LinkedIn | Title and summary (the link is the card) | A link card with title, summary and picture. Picture must be JPG, PNG or GIF |

The picture is the post's first `pictures.social` image, then its hero, then its feed image. A long summary is shortened at a word with "…". The link is never cut. If a picture can't be used the post still goes out without it, and the run says so.

## Setting it up

Do this once. Settings that aren't secret go in `source/_data/posse.js`. The five secrets go in GitHub: **repository Settings → Secrets and variables → Actions → New repository secret**.

### Mastodon

1. On your instance: **Preferences → Development → New application**.
2. Name it "POSSE". Untick every scope except **`write:statuses`**. Save.
3. Open the application and copy **Your access token**. Save it as the secret `MASTODON_TOKEN`.
4. Check `mastodon.instance` in `posse.js`.

### Bluesky

1. **Settings → Privacy and security → App passwords → Add App Password**. Name it "POSSE". Don't tick the direct messages option.
2. Save it as the secret `BLUESKY_APP_PASSWORD`. It is shown once.
3. Put your handle in `posse.js`: `bluesky.identifier: "yourname.bsky.social"`.

### LinkedIn

LinkedIn is the fiddly one, and its token lasts 60 days.

1. Go to <https://developer.linkedin.com/> and **Create app**. LinkedIn asks you to link a LinkedIn Page. If you don't have one, make a placeholder page.
2. **Products** tab: request **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect**. Both are normally granted straight away.
3. **Auth** tab: under **Authorized redirect URLs** add `http://localhost:8765/callback`. Copy the **Client ID** and **Client Secret**.
4. On your computer, in the repo:
   ```
   LINKEDIN_CLIENT_ID=... LINKEDIN_CLIENT_SECRET=... node scripts/posse-linkedin-auth.mjs
   ```
   Open the address it prints, approve, and it prints three values. Save them as the secrets `LINKEDIN_TOKEN`, `LINKEDIN_AUTHOR` and `LINKEDIN_TOKEN_EXPIRES`.
5. **Every two months** run step 4 again and replace the three secrets. The run warns in its log for the last 14 days, and stops sending LinkedIn posts after the date. Put a reminder in your calendar for about 50 days from now.
6. LinkedIn retires its API versions. If posts start failing with a message about the version, change `linkedin.version` in `posse.js` to a newer `YYYYMM`.

### GitHub

The workflow file is already in `.github/workflows/`. It only runs from the default branch (main), so nothing happens until it is merged there. To send straight away instead of waiting up to half an hour: **Actions → POSSE → Run workflow**.

## Trying it

The command previews by default. It reads the live `/posse.json`, so the post has to be deployed first:

```
node scripts/posse.mjs                 # shows exactly what would be sent. Sends nothing.
node scripts/posse.mjs --post          # sends it
node scripts/posse.mjs --only bluesky  # one network
node scripts/posse.mjs --url https://benjamin.parry.is/writing/2026/11/torn/   # one post
```

A first safe test: set `syndicate: [mastodon]` on one new post, deploy, run the preview, check the words, then use **Run workflow**. Open `https://benjamin.parry.is/posse.json` to see what the site is offering.

## Things to know

- **The Action commits to main.** Each sent post adds a `syndication:` line to its file on main. If you work on `hanasaku`, merge main into it now and then (`git merge origin/main`) so you pick those up. A conflict is only possible if you edit the same lines of the same post.
- **Failures.** If a network fails, the others still go out, the links that worked are still committed, and the run turns red (GitHub emails you). The next run tries the failed one again. A post whose file can't be found is never sent, because the link couldn't be recorded and it would be sent again.
- **Mastodon** also gets an idempotency key, so a retry within an hour can't double-post. After that, the saved link is what stops repeats.
- **Replies and likes** from the networks don't come back by themselves. Because the `syndication` links are on your posts, a service such as Bridgy (<https://brid.gy>) can send them back to webmention.io. Check which networks it currently supports.
- **No hashtags** are added.
- **Posts you edit or delete** are not changed or removed on the networks.
- **If you rename the feed collection** (for example to `writing`), change `feeds` in `posse.js`. Any collection named there is read.

## Tests

```
node scripts/posse-test.mjs
```

80 checks against a pretend internet: the words and limits, Bluesky's byte offsets with emoji, LinkedIn escaping, the front matter edit, each network's requests, and whole runs (nothing sent twice, one network failing, missing secrets, old posts, expired token).
