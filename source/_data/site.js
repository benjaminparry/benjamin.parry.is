// Facts about the site that templates, feeds and webmentions need.
// Available in every template as {{ site.url }}, {{ site.author.name }} and so on.
export default {
  title: "Benjamin Parry",

  // The live address, without a trailing slash. Webmentions are matched against this, so it must be the
  // real domain even on a Netlify deploy preview. Set SITE_URL only to try a different address locally.
  url: (process.env.SITE_URL || "https://benjamin.parry.is").replace(/\/+$/, ""),

  author: {
    name: "Benjamin Parry",
    photo: "/assets/images/profile/benjamin-parry-300x300.jpg",
  },

  webmention: {
    // The site name you gave webmention.io. Normally your domain.
    domain: "benjamin.parry.is",
    endpoint: "https://webmention.io/benjamin.parry.is/webmention",
    pingback: "https://webmention.io/benjamin.parry.is/xmlrpc",
  },

  // Profiles that link back to this site. webmention.io uses these to let you sign in: each
  // profile needs a link back to https://benjamin.parry.is (see WEBMENTIONS.md).
  me: [
    "https://github.com/benjaminparry",
    "https://mastodon.social/@benjaminparry",
  ],
};
