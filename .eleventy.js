
module.exports = config => {
  
  // RSS feed
  const rssPlugin = require('@11ty/eleventy-plugin-rss');

  // Filters
  const dateFilter = require('./source/filters/date-filter.js');
  const w3DateFilter = require('./source/filters/w3-date-filter.js');

  const sortByDisplayOrder = require('./source/utilities/sort-by-display-order.js');
  
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
  config.addCollection('thoughts', collection => {
    return [...collection.getFilteredByGlob('./source/collecting/thoughts/*.md')].reverse();
  });

  // Returns work items, sorted by display order then filtered by featured
  config.addCollection('featuredWork', collection => {
    return sortByDisplayOrder(collection.getFilteredByGlob('./source/working/*.md')).filter(
      x => x.data.featured
    );
  });

  config.addPassthroughCopy('./source/assets/');

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