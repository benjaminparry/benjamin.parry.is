// Drafts: a post with  draft: true  in its front matter is shown while you work on it locally
// (npm start) and left out of every real build, so it never reaches the live site.
// Nothing is written for it: no page, no place in a list, a feed or a tag page.
//
//   ---
//   title: "Torn"
//   draft: true
//   ---
//
// Take the line out (or set draft: false) when it is ready.
//
// To see drafts in a normal build as well, set SHOW_DRAFTS=1:   SHOW_DRAFTS=1 npx eleventy
//
// Eleventy tells us how it is running in ELEVENTY_RUN_MODE: "serve" (npm start), "watch" or "build".
// Anything else, including nothing at all, counts as a real build, so a draft is only ever shown on purpose.

export const isDraft = (data) => data?.draft === true || data?.draft === "true";

export function showDrafts(env = process.env) {
  return Boolean(env.SHOW_DRAFTS) || env.ELEVENTY_RUN_MODE === "serve" || env.ELEVENTY_RUN_MODE === "watch";
}

// true when this page should be left out of the build
export const hidesDraft = (data, env = process.env) => isDraft(data) && !showDrafts(env);

export function addDrafts(eleventyConfig) {
  const hidden = [];
  // Returning false from a preprocessor tells Eleventy to skip the file altogether.
  eleventyConfig.addPreprocessor("drafts", "*", (data) => {
    if (!hidesDraft(data)) return;
    hidden.push(data.page?.inputPath ?? data.title ?? "a draft");
    return false;
  });
  eleventyConfig.on("eleventy.after", () => {
    if (hidden.length) console.log(`[drafts] left out of this build: ${[...new Set(hidden)].join(", ")}`);
    hidden.length = 0;
  });
}
