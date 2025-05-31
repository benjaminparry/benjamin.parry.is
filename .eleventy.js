const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");

module.exports = (config) => {
  // START: markdown-it-anchor

  // REF: https://rhianvanesch.com/posts/2021/02/09/adding-heading-anchor-links-to-an-eleventy-site/
  // Options for the `markdown-it` library
  const markdownItOptions = {
    html: true,
  };

  // Options for the `markdown-it-anchor` library
  const markdownItAnchorOptions = {
    permalink: true,

    // START: Custom render function for accessible anchor links
    // REF: https://nicolas-hoizey.com/articles/2021/02/25/accessible-anchor-links-with-markdown-it-and-eleventy/
    renderPermalink: (slug, opts, state, idx) => {
      // based on fifth version in
      // https://amberwilson.co.uk/blog/are-your-anchor-links-accessible/
      const linkContent = state.tokens[idx + 1].children[0].content;

      // Create the openning <div> for the wrapper
      const headingWrapperTokenOpen = Object.assign(
        new state.Token("div_open", "div", 1),
        {
          attrs: [["class", "heading-wrapper"]],
        },
      );
      // Create the closing </div> for the wrapper
      const headingWrapperTokenClose = Object.assign(
        new state.Token("div_close", "div", -1),
        {
          attrs: [["class", "heading-wrapper"]],
        },
      );

      // Create the tokens for the full accessible anchor link
      // <a class="deeplink" href="#your-own-platform-is-the-nearest-you-can-get-help-to-setup">
      //   <span aria-hidden="true">
      //     ${opts.permalinkSymbol}
      //   </span>
      //   <span class="visually-hidden">
      //     Section titled Your "own" platform is the nearest you can(get help to) setup
      //   </span>
      // </a >
      const anchorTokens = [
        Object.assign(new state.Token("link_open", "a", 1), {
          attrs: [
            ...(opts.permalinkClass ? [["class", opts.permalinkClass]] : []),
            ["href", opts.permalinkHref(slug, state)],
            ...Object.entries(opts.permalinkAttrs(slug, state)),
          ],
        }),
        Object.assign(new state.Token("span_open", "span", 1), {
          attrs: [["aria-hidden", "true"]],
        }),
        Object.assign(new state.Token("html_block", "", 0), {
          content: opts.permalinkSymbol,
        }),
        Object.assign(new state.Token("span_close", "span", -1), {}),
        Object.assign(new state.Token("span_open", "span", 1), {
          attrs: [["class", "visually-hidden"]],
        }),
        Object.assign(new state.Token("html_block", "", 0), {
          content: `Section titled ${linkContent}`,
        }),
        Object.assign(new state.Token("span_close", "span", -1), {}),
        new state.Token("link_close", "a", -1),
      ];

      // idx is the index of the heading's first token
      // insert the wrapper opening before the heading
      state.tokens.splice(idx, 0, headingWrapperTokenOpen);
      // insert the anchor link tokens after the wrapper opening and the 3 tokens of the heading
      state.tokens.splice(idx + 3 + 1, 0, ...anchorTokens);
      // insert the wrapper closing after all these
      state.tokens.splice(
        idx + 3 + 1 + anchorTokens.length,
        0,
        headingWrapperTokenClose,
      );
    },
    //
    // END: Custom render function for accessible anchor links
    //
  };

  const markdownLib = markdownIt(markdownItOptions).use(
    markdownItAnchor,
    markdownItAnchorOptions,
  );

  config.setLibrary("md", markdownLib);
  //
  // END: markdown-it-anchor
  //

  // RSS feed
  const rssPlugin = require("@11ty/eleventy-plugin-rss");

  // Filters
  const dateFilter = require("./source/filters/date-filter.js");
  const w3DateFilter = require("./source/filters/w3-date-filter.js");

  // const pluginWebmentions = require("@chrisburnell/eleventy-cache-webmentions");
  // const configWebmentions = require("./source/_data/configWebmentions.js");
  // config.addPlugin(pluginWebmentions, configWebmentions);

  const sortByDisplayOrder = require("./source/utilities/sort-by-display-order.js");

  //   https://www.aleksandrhovhannisyan.com/blog/useful-11ty-filters/
  const toISOString = (dateString) => new Date(dateString).toISOString();
  config.addFilter("toISOString", toISOString);

  // Add filters
  config.addFilter("dateFilter", dateFilter);
  config.addFilter("w3DateFilter", w3DateFilter);

  // Filer to replicate the YYYY/MM url for posts
  // https://github.com/11ty/eleventy/issues/923#issuecomment-584529625
  config.addFilter("post_permalink", (page) => {
    const yyyy = page.date.getFullYear();
    const mm = String(page.date.getMonth() + 1).padStart(2, "0");
    return `${yyyy}/${mm}/${page.fileSlug}/`;
  });

  config.addFilter("yearOnly", (page) => {
    const yyyy = page.date.getFullYear();
    return `${yyyy}/`;
  });

  // Plugins
  config.addPlugin(rssPlugin);

  // Tags
  // https://stackoverflow.com/a/66186773
  config.addCollection("tagsList", (collectionApi) => {
    const tagsSet = new Set();
    collectionApi.getAll().forEach((item) => {
      if (!item.data.tags) return;
      item.data.tags
        // .filter((tag) => !['foo', 'bar'].includes(tag))
        .forEach((tag) => tagsSet.add(tag));
    });
    return [...tagsSet].sort((a, b) => b.localeCompare(a)).reverse();
  });

  // Returns a collection of blog posts in reverse date order
  config.addCollection("writing", (collection) => {
    return [...collection.getFilteredByGlob("./source/writing/*.md")].reverse();
  });

  // Returns a collection of making projects in reverse date order
  config.addCollection("making", (collection) => {
    return [...collection.getFilteredByGlob("./source/making/*.md")].reverse();
  });

  // Returns work items, sorted by display order
  config.addCollection("working", (collection) => {
    return [...collection.getFilteredByGlob("./source/working/*.md")].reverse();
  });

  // Returns a collection of all collected items in reverse date order
  config.addCollection("collecting", (collection) => {
    return [
      ...collection.getFilteredByGlob("./source/collecting/*/*.md"),
    ].reverse();
  });

  // Returns a collection of all collected items in reverse date order
  config.addCollection("sending", (collection) => {
    return [
      ...collection.getFilteredByGlob("./source/sending/*/*.md"),
    ].reverse();
  });

  // Returns a collection of all collected items in reverse date order
  config.addCollection("replies", (collection) => {
    return [
      ...collection.getFilteredByGlob("./source/sending/replies/*.md"),
    ].reverse();
  });

  // Returns a collection of all collected items in reverse date order
  config.addCollection("likes", (collection) => {
    return [
      ...collection.getFilteredByGlob("./source/sending/likes/*.md"),
    ].reverse();
  });

  // Returns a collection of links in reverse date order
  config.addCollection("celebrations", (collection) => {
    return [
      ...collection.getFilteredByGlob("./source/celebrating/*.md"),
    ].reverse();
  });

  // Returns a collection of links in reverse date order
  config.addCollection("links", (collection) => {
    return [
      ...collection.getFilteredByGlob("./source/collecting/links/*.md"),
    ].reverse();
  });

  // Returns a collection of thoughts in reverse date order
  config.addCollection("lists", (collection) => {
    return [
      ...collection.getFilteredByGlob("./source/collecting/lists/*.md"),
    ].reverse();
  });

  // Returns a collection of watchlist in reverse date order
  config.addCollection("watchlist", (collection) => {
    return [
      ...collection.getFilteredByGlob("./source/watching/*.md"),
    ].reverse();
  });

  // Returns a collection of thoughts in reverse date order
  config.addCollection("thoughts", (collection) => {
    return [
      ...collection.getFilteredByGlob("./source/collecting/thoughts/*.md"),
    ].reverse();
  });

  // Returns a collection of cycles in reverse date order
  config.addCollection("cycles", (collection) => {
    return [
      ...collection.getFilteredByGlob("./source/collecting/cycles/*.md"),
    ].reverse();
  });

  // Returns a collection of photos in reverse date order
  config.addCollection("photos", (collection) => {
    return [
      ...collection.getFilteredByGlob("./source/collecting/photos/*.md"),
    ].reverse();
  });

  // Returns a collection of everything in reverse date order
  config.addCollection("everything", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob([
        "./source/writing/*.md",
        "./source/collecting/*/*.md",
        "./source/sending/*/*.md",
        "./source/making/*.md",
        "./source/attending/*.md",
        "./source/celebrating/*.md",
        "./source/speaking/*.md",
        // "./source/watching/*.md",
      ])
      .reverse();
  });

  // Returns a collection of attending
  config.addCollection("attending", (collection) => {
    return (
      [...collection.getFilteredByGlob("./source/attending/*.md")]
        // https://samimaatta.fi/en/a-custom-collection-to-sort-events-with-eleventy/
        // Filters only upcoming dates
        .filter(function (item) {
          var dateToday = new Date();
          if (item.data.start > dateToday) {
            return item;
          }
        })
        // TODO order events by start date item.data.start
        // Kind of working below but breaks with time included in date
        .sort((a, b) => {
          return a.data.start - b.data.start;
        })
    );
  });
  config.addCollection("attended", (collection) => {
    return (
      [...collection.getFilteredByGlob("./source/attending/*.md")]
        // https://samimaatta.fi/en/a-custom-collection-to-sort-events-with-eleventy/
        // Filters only upcoming dates
        .filter(function (item) {
          var dateToday = new Date();
          if (item.data.start < dateToday) {
            return item;
          }
        })
        // TODO order events by start date item.data.start
        // Kind of working below but breaks with time included in date
        .sort((a, b) => {
          return a.data.start - b.data.start;
        })
        .reverse()
    );
  });

  // Returns a collection of speaking in reverse date order
  config.addCollection("speaking", (collection) => {
    return [
      ...collection.getFilteredByGlob("./source/speaking/*.md"),
    ].reverse();
  });

  // Returns work items, sorted by display order then filtered by featured
  config.addCollection("featuredWork", (collection) => {
    return sortByDisplayOrder(
      collection.getFilteredByGlob("./source/working/*.md"),
    ).filter((x) => x.data.featured);
  });

  config.addPassthroughCopy("./source/assets/");
  config.addPassthroughCopy("./source/serviceworker.js");

  return {
    markdownTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input: "source",
      output: "build",
    },
  };
};
