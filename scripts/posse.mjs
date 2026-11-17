// POSSE: send posts from the site to Mastodon, Bluesky and LinkedIn, then write each new address back into the
// post's front matter as `syndication:`. https://indieweb.org/POSSE
//
//   node scripts/posse.mjs                     preview: shows what would be sent, sends nothing
//   node scripts/posse.mjs --post              send it
//   --only mastodon,bluesky                    just those networks
//   --url https://benjamin.parry.is/…/         just one post
//   --allow-old                                ignore maxAgeDays for this run
//   --file posse.json                          read a saved copy instead of the live site (for testing)
//
// A post is sent when it has  syndicate: true  (or a list of networks) in its front matter, it isn't already on that
// network (a link to it is in `syndication`), and it is newer than maxAgeDays. Settings: source/_data/posse.js.
// Secrets come from the environment (GitHub secrets):
//   MASTODON_TOKEN, BLUESKY_APP_PASSWORD, LINKEDIN_TOKEN, LINKEDIN_AUTHOR, LINKEDIN_TOKEN_EXPIRES (a date)
// The post's file is checked and rewritten BEFORE the next post is sent, so a failure part-way can't cause repeats.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { NETWORKS, alreadyOn, compose, mastodonLength, graphemes, addSyndication } from "../_config/posse.js";
import { postMastodon, postBluesky, postLinkedIn } from "../_config/posse-networks.js";

const DAY = 86_400_000;

export async function run({ items, config, env = {}, fetchFn = fetch, root = ".", post = false, only, url, allowOld = false, now = new Date(), log = console.log }) {
  const results = [];
  const record = (item, network, status, detail = "") => { results.push({ url: item.url, network, status, detail }); log(`  ${network.padEnd(9)} ${status}${detail ? `: ${detail}` : ""}`); };
  const wantNetworks = only?.length ? only : NETWORKS;
  const warned = new Set();

  const chosen = items.filter((item) => !url || item.url === url).sort((a, b) => a.date.localeCompare(b.date));
  if (!chosen.length) log(url ? `No post in the list has the address ${url}` : "No posts have asked to be syndicated.");

  for (const item of chosen) {
    log(`\n${item.title || item.url}\n  ${item.url}`);
    for (const name of item.unknown ?? []) log(`  "${name}" in syndicate isn't a network I know (${NETWORKS.join(", ")})`);
    for (const network of item.syndicate.filter((n) => wantNetworks.includes(n))) {
      const settings = config[network] ?? {};
      if (settings.enabled === false) { record(item, network, "skipped", "switched off in posse.js"); continue; }
      if (alreadyOn(item.syndication, network, config)) { record(item, network, "already there"); continue; }
      const age = (now - new Date(item.date)) / DAY;
      if (!allowOld && age > config.maxAgeDays) { record(item, network, "too old", `${Math.floor(age)} days, the limit is ${config.maxAgeDays} (--allow-old overrides)`); continue; }

      // what's needed to send it
      const need = {
        mastodon: [["MASTODON_TOKEN", env.MASTODON_TOKEN]],
        bluesky: [["BLUESKY_APP_PASSWORD", env.BLUESKY_APP_PASSWORD], ["bluesky.identifier in posse.js", settings.identifier]],
        linkedin: [["LINKEDIN_TOKEN", env.LINKEDIN_TOKEN], ["LINKEDIN_AUTHOR", env.LINKEDIN_AUTHOR]],
      }[network].filter(([, value]) => !value).map(([name]) => name);
      if (need.length) { record(item, network, post ? "FAILED" : "can't send", `missing ${need.join(", ")}`); continue; }
      if (network === "linkedin" && env.LINKEDIN_TOKEN_EXPIRES) {
        const left = (new Date(env.LINKEDIN_TOKEN_EXPIRES) - now) / DAY;
        if (left <= 0) { record(item, network, post ? "FAILED" : "can't send", `the LinkedIn token ran out on ${env.LINKEDIN_TOKEN_EXPIRES}. Run scripts/posse-linkedin-auth.mjs for a new one`); continue; }
        if (left < 14 && !warned.has("linkedin")) { warned.add("linkedin"); log(`  ! the LinkedIn token runs out in ${Math.ceil(left)} days. Run scripts/posse-linkedin-auth.mjs for a new one`); }
      }

      // the file must be there to write the link into, or we couldn't remember that we sent it
      const file = join(root, item.file ?? "");
      if (!item.file || !existsSync(file) || addSyndication(readFileSync(file, "utf8"), "https://example.com/") === undefined) {
        record(item, network, post ? "FAILED" : "can't send", `can't find front matter to record the link in (${item.file})`);
        continue;
      }

      const measure = network === "mastodon" ? mastodonLength : graphemes;
      const text = compose(item, { limit: settings.limit ?? 300, measure, includeUrl: network !== "linkedin" });
      const link = { url: item.url, title: item.title || item.url, description: item.summary };

      if (!post) { record(item, network, "would send", `${measure(text)} characters${item.image ? ", with picture" : ""}\n${text.replace(/^/gm, "      | ")}`); continue; }

      try {
        const sent = network === "mastodon"
          ? await postMastodon({ instance: settings.instance, token: env.MASTODON_TOKEN, text, language: config.language, visibility: settings.visibility, key: createHash("sha256").update(`${item.url}|mastodon`).digest("hex") }, fetchFn)
          : network === "bluesky"
            ? await postBluesky({ service: settings.service, identifier: settings.identifier, password: env.BLUESKY_APP_PASSWORD, text, link, image: item.image, language: config.language }, fetchFn)
            : await postLinkedIn({ token: env.LINKEDIN_TOKEN, author: env.LINKEDIN_AUTHOR, version: settings.version, text, link, image: item.image }, fetchFn);
        writeFileSync(file, addSyndication(readFileSync(file, "utf8"), sent.url));
        item.syndication.push(sent.url);
        record(item, network, "sent", sent.url);
        for (const note of sent.notes ?? []) log(`    note: ${note}`);
      } catch (error) {
        record(item, network, "FAILED", error.message);
      }
    }
  }
  const failed = results.filter((r) => r.status === "FAILED").length;
  const sent = results.filter((r) => r.status === "sent").length;
  log(`\n${post ? `${sent} sent` : `${results.filter((r) => r.status === "would send").length} would be sent`}${failed ? `, ${failed} failed` : ""}.${post ? "" : " Nothing sent. Add --post to send."}`);
  return { results, failed, sent };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const option = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
  const root = join(fileURLToPath(import.meta.url), "../..");
  const { default: config } = await import("../source/_data/posse.js");
  const { default: site } = await import("../source/_data/site.js");

  let items;
  try {
    if (option("file")) items = JSON.parse(readFileSync(option("file"), "utf8")).items;
    else {
      const address = option("feed") ?? `${site.url}/posse.json`;
      const reply = await fetch(address, { headers: { "User-Agent": "benjamin.parry.is-posse" } });
      if (reply.status === 404) { console.log(`${address} isn't published yet (404), so there is nothing to send. It appears after the site with the posse.json template has deployed.`); process.exit(0); }
      if (!reply.ok) throw new Error(`${address} answered ${reply.status}`);
      items = (await reply.json()).items;
    }
  } catch (error) {
    console.error(`Couldn't read the list of posts: ${error.message}`);
    process.exit(1);
  }
  const outcome = await run({ items, config, env: process.env, root, post: args.includes("--post"), only: option("only")?.split(",").map((s) => s.trim()), url: option("url"), allowOld: args.includes("--allow-old") });
  process.exit(outcome.failed ? 1 : 0);
}
