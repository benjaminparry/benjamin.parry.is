
module.exports = config => {

  // RSS feed
  const rssPlugin = require('@11ty/eleventy-plugin-rss');

  // Filters
  const dateFilter = require('./source/filters/date-filter.js');
  const w3DateFilter = require('./source/filters/w3-date-filter.js');


  const pluginWebmentions = require("@chrisburnell/eleventy-cache-webmentions");
  const configWebmentions = require("./source/_data/configWebmentions.js");

  config.addPlugin(pluginWebmentions, configWebmentions);

  const sortByDisplayOrder = require('./source/utilities/sort-by-display-order.js');

//   https://www.aleksandrhovhannisyan.com/blog/useful-11ty-filters/
  const toISOString = (dateString) => new Date(dateString).toISOString();
  config.addFilter('toISOString', toISOString);

  // Add filters
  config.addFilter('dateFilter', dateFilter);
  config.addFilter('w3DateFilter', w3DateFilter);

  // Filer to replicate the YYYY/MM url for posts
  // https://github.com/11ty/eleventy/issues/923#issuecomment-584529625
  config.addFilter("post_permalink", page => {
    const yyyy = page.date.getFullYear();
    const mm = String(page.date.getMonth() + 1).padStart(2, "0");
    return `${yyyy}/${mm}/${page.fileSlug}/`;
  });

  config.addFilter("yearOnly", page => {
    const yyyy = page.date.getFullYear();
    return `${yyyy}/`;
  });

  // Plugins
  config.addPlugin(rssPlugin);


  // Tags
  // https://stackoverflow.com/a/66186773
  config.addCollection('tagsList', (collectionApi) => {
    const tagsSet = new Set()
    collectionApi.getAll().forEach((item) => {
      if (!item.data.tags) return
      item.data.tags
        // .filter((tag) => !['foo', 'bar'].includes(tag))
        .forEach((tag) => tagsSet.add(tag))
    })
    return [...tagsSet].sort((a, b) => b.localeCompare(a)).reverse();
  })

  // Returns a collection of blog posts in reverse date order
  config.addCollection('writing', collection => {
    return [...collection.getFilteredByGlob('./source/writing/*.md')].reverse();
  });

  // Returns a collection of making projects in reverse date order
  config.addCollection('making', collection => {
    return [...collection.getFilteredByGlob('./source/making/*.md')].reverse();
  });

  // Returns work items, sorted by display order
  config.addCollection('working', collection => {
    return [...collection.getFilteredByGlob('./source/working/*.md')].reverse();
  });

  // Returns a collection of all collected items in reverse date order
  config.addCollection('collecting', collection => {
    return [...collection.getFilteredByGlob('./source/collecting/*/*.md')].reverse();
  });

  // Returns a collection of links in reverse date order
  config.addCollection('links', collection => {
    return [...collection.getFilteredByGlob('./source/collecting/links/*.md')].reverse();
  });

// Returns a collection of thoughts in reverse date order
config.addCollection('lists', collection => {
return [...collection.getFilteredByGlob('./source/collecting/lists/*.md')].reverse();
});

// Returns a collection of watchlist in reverse date order
config.addCollection('watchlist', collection => {
return [...collection.getFilteredByGlob('./source/watching/*.md')].reverse();
});

  // Returns a collection of thoughts in reverse date order
config.addCollection('thoughts', collection => {
return [...collection.getFilteredByGlob('./source/collecting/thoughts/*.md')].reverse();
});

// Returns a collection of cycles in reverse date order
config.addCollection('cycles', collection => {
return [...collection.getFilteredByGlob('./source/collecting/cycles/*.md')].reverse();
});

// Returns a collection of attending
config.addCollection('attending', collection => {
    return [...collection.getFilteredByGlob('./source/attending/*.md')]
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
  }).reverse();
});
config.addCollection('attended', collection => {
    return [...collection.getFilteredByGlob('./source/attending/*.md')]
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
  }).reverse();
});

// Returns a collection of speaking in reverse date order
config.addCollection('speaking', collection => {
return [...collection.getFilteredByGlob('./source/speaking/*.md')].reverse();
});

  // Returns work items, sorted by display order then filtered by featured
  config.addCollection('featuredWork', collection => {
    return sortByDisplayOrder(collection.getFilteredByGlob('./source/working/*.md')).filter(
      x => x.data.featured
    );
  });

  config.addPassthroughCopy('./source/assets/');
  config.addPassthroughCopy("./source/serviceworker.js");

  return {
    markdownTemplateEngine: 'njk',
    dataTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    dir: {
      input: 'source',
      output: 'build'
    }
  };
};