module.exports = function(eleventyConfig) {
  // Add a filter using the Config API
  eleventyConfig.addFilter( "myFilter", function() {});

  //
  // Add collections
  //
  // Maybe do this instead? https://www.11ty.dev/docs/collections/#getfilteredbyglob(-glob-)
  // https://www.pborenstein.com/posts/collections/#custom-collections
  // Writings
  eleventyConfig.addCollection("writings",
    collection => collection
      .getAllSorted()
      .filter(item => item.url
        && item.inputPath.startsWith('./src/content/writings/')))
  // Thoughts
  eleventyConfig.addCollection("thoughts",
    collection => collection
      .getAllSorted()
      .filter(item => item.url
        && item.inputPath.startsWith('./src/content/collecting/thoughts/')))
  // Lists
  eleventyConfig.addCollection("lists",
    collection => collection
      .getAllSorted()
      .filter(item => item.url
        && item.inputPath.startsWith('./src/content/collecting/lists/')))
  // Links
  eleventyConfig.addCollection("links",
    collection => collection
      .getAllSorted()
      .filter(item => item.url
        && item.inputPath.startsWith('./src/content/collecting/links/')))
  // Collecting
  eleventyConfig.addCollection("collecting",
    collection => collection
      .getAllSorted()
      .filter(item => item.url
        && item.inputPath.startsWith('./src/content/collecting/')))


  // You can return your Config object (optional).
  return {
    dir: {
      input: "src",
      output: "www",
      includes: 'includes',
      layouts: 'layouts',
      data: 'data'
    },
    templateFormats: ['njk', 'md']
  };
};
