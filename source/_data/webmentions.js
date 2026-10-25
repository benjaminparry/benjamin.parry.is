// Every incoming webmention for the site, fetched from webmention.io each time the site is built.
// Available in every template as {{ webmentions }}, and shown with macros/webmentions.html.
//
// Needs the WEBMENTION_IO_TOKEN environment variable (see WEBMENTIONS.md). Without it the build still
// works, there just aren't any mentions on the pages.
import { fetchWebmentions } from "../../_config/webmentions.js";
import site from "./site.js";

export default async function () {
  return fetchWebmentions({
    domain: site.webmention.domain,
    token: process.env.WEBMENTION_IO_TOKEN,
    cacheFile: ".cache/webmentions.json",
    // On Netlify (or any CI) always fetch fresh. On your own computer reuse the last copy for 10 minutes,
    // so `npm start` doesn't call webmention.io every time you save a file.
    maxAgeMinutes: process.env.NETLIFY || process.env.CI ? 0 : 10,
  });
}
