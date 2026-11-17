// One function per network. Each takes what it needs, returns { url, notes } (the address of the new post, and
// anything worth saying), and throws an Error saying what went wrong. A `fetch` can be passed in for testing.
// Secrets are only ever sent to the network they belong to and are never put in an error message.
import { linkFacets, escapeLinkedIn, shorten } from "./posse.js";

async function call(fetchFn, url, options, what) {
  const reply = await fetchFn(url, options);
  if (!reply.ok) {
    const body = (await reply.text().catch(() => "")).slice(0, 300).replace(/\s+/g, " ");
    throw new Error(`${what}: ${reply.status} ${reply.statusText} ${body}`.trim());
  }
  return reply;
}

// A picture to attach: downloaded here, then handed on. Returns undefined if it can't be used (and says why in notes).
async function download(fetchFn, image, { maxBytes, types }, notes) {
  if (!image?.url) return undefined;
  try {
    if (types && image.type && !types.includes(image.type)) { notes.push(`image left off: ${image.type} isn't accepted here`); return undefined; }
    const reply = await fetchFn(image.url);
    if (!reply.ok) { notes.push(`image left off: ${image.url} answered ${reply.status}`); return undefined; }
    const bytes = new Uint8Array(await reply.arrayBuffer());
    if (maxBytes && bytes.length > maxBytes) { notes.push(`image left off: ${Math.round(bytes.length / 1024)} KB is over the ${Math.round(maxBytes / 1024)} KB limit`); return undefined; }
    return { bytes, type: image.type || reply.headers.get("content-type") || "application/octet-stream" };
  } catch (error) {
    notes.push(`image left off: ${error.message}`);
    return undefined;
  }
}

// ---- Mastodon ----  https://docs.joinmastodon.org/methods/statuses/  (needs the write:statuses scope)
// The link card (title, summary, picture) is made by Mastodon from the page's own social tags.
export async function postMastodon({ instance, token, text, language, visibility = "public", key }, fetchFn = fetch) {
  const reply = await call(fetchFn, `${instance.replace(/\/+$/, "")}/api/v1/statuses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
    body: JSON.stringify({ status: text, visibility, ...(language ? { language } : {}) }),
  }, "Mastodon");
  const status = await reply.json();
  if (!status.url) throw new Error("Mastodon: the reply had no url");
  return { url: status.url, notes: [] };
}

// ---- Bluesky ----  https://docs.bsky.app/docs/tutorials/creating-a-post  (an app password, not your main one)
export async function postBluesky({ service = "https://bsky.social", identifier, password, text, link, image, language }, fetchFn = fetch) {
  const base = service.replace(/\/+$/, "");
  const json = { "Content-Type": "application/json" };
  const session = await (await call(fetchFn, `${base}/xrpc/com.atproto.server.createSession`, { method: "POST", headers: json, body: JSON.stringify({ identifier, password }) }, "Bluesky sign-in")).json();
  const auth = { Authorization: `Bearer ${session.accessJwt}` };
  const notes = [];

  const external = { uri: link.url, title: link.title, description: link.description };
  const picture = await download(fetchFn, image, { maxBytes: 950_000, types: ["image/jpeg", "image/png", "image/webp", "image/gif"] }, notes);
  if (picture) {
    try {
      const uploaded = await (await call(fetchFn, `${base}/xrpc/com.atproto.repo.uploadBlob`, { method: "POST", headers: { ...auth, "Content-Type": picture.type }, body: picture.bytes }, "Bluesky image upload")).json();
      external.thumb = uploaded.blob;
    } catch (error) { notes.push(`image left off: ${error.message}`); }
  }

  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
    ...(language ? { langs: [language] } : {}),
    facets: linkFacets(text, link.url),
    embed: { $type: "app.bsky.embed.external", external },
  };
  const made = await (await call(fetchFn, `${base}/xrpc/com.atproto.repo.createRecord`, { method: "POST", headers: { ...auth, ...json }, body: JSON.stringify({ repo: session.did, collection: "app.bsky.feed.post", record }) }, "Bluesky post")).json();
  const rkey = String(made.uri ?? "").split("/").pop();
  if (!rkey) throw new Error("Bluesky: the reply had no post address");
  return { url: `https://bsky.app/profile/${session.handle ?? session.did}/post/${rkey}`, notes };
}

// ---- LinkedIn ----  https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
// The Posts API doesn't read the page, so the card's title, description and picture are sent by us.
export async function postLinkedIn({ token, author, version = "202610", text, link, image }, fetchFn = fetch) {
  const headers = { Authorization: `Bearer ${token}`, "Linkedin-Version": version, "X-Restli-Protocol-Version": "2.0.0" };
  const json = { ...headers, "Content-Type": "application/json" };
  const notes = [];
  const article = { source: link.url, title: shorten(link.title, 200), ...(link.description ? { description: shorten(link.description, 300) } : {}) };

  const picture = await download(fetchFn, image, { types: ["image/jpeg", "image/png", "image/gif"] }, notes);
  if (picture) {
    try {
      const started = await (await call(fetchFn, "https://api.linkedin.com/rest/images?action=initializeUpload", { method: "POST", headers: json, body: JSON.stringify({ initializeUploadRequest: { owner: author } }) }, "LinkedIn image start")).json();
      await call(fetchFn, started.value.uploadUrl, { method: "PUT", headers: { Authorization: headers.Authorization, "Content-Type": picture.type }, body: picture.bytes }, "LinkedIn image upload");
      article.thumbnail = started.value.image;
    } catch (error) { notes.push(`image left off: ${error.message}`); }
  }

  const reply = await call(fetchFn, "https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: json,
    body: JSON.stringify({
      author,
      commentary: escapeLinkedIn(text),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { article },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  }, "LinkedIn post");
  const id = reply.headers.get("x-restli-id");
  if (!id) throw new Error("LinkedIn: the reply had no post id");
  return { url: `https://www.linkedin.com/feed/update/${id}/`, notes };
}
