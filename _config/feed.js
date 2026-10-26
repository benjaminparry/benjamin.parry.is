// Helpers for the Atom feeds (/feed.xml, /sending/feed.xml).
// Plain JavaScript with no Eleventy code in it, so it is easy to test on its own.
//
// webmention.app reads a feed to find new posts, then sends webmentions for the links in them.
// So a like or a reply has to have the link it is about *inside* its feed entry.

import { updatesOf } from "./updated.js";

const escapeHtml = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const link = (url) => `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`;

// The HTML for one feed entry: a line about what the post is responding to (likes, replies and so on),
// then the post itself. Returns plain text of HTML, to be XML-escaped once by the feed template.
// Pass showUpdates = true (the updated feed) to put the post's list of updates, with their comments, first.
export function feedContent(post, showUpdates = false) {
  const data = post.data ?? {};
  const lead = [];
  if (data.likeOf) lead.push(`<p>Liked ${link(data.likeOf)}</p>`);
  if (data.inReplyTo) lead.push(`<p>In reply to ${link(data.inReplyTo)}</p>`);
  if (data.repostOf) lead.push(`<p>Reposted ${link(data.repostOf)}</p>`);
  if (data.bookmarkOf) lead.push(`<p>Bookmarked ${link(data.bookmarkOf)}</p>`);
  const updates = showUpdates ? updatesOf(post) : [];
  if (updates.length) {
    const items = updates.map((u) =>
      `<li>${u.date.toISOString().slice(0, 10)}${u.comment ? `: ${escapeHtml(u.comment)}` : ""}</li>`);
    lead.push(`<p>Updated:</p><ul>${items.join("")}</ul>`);
  }
  return lead.join("") + (post.templateContent ?? "");
}
