export default function (eleventyConfig) {

  // Set source and build directories
  eleventyConfig.setInputDirectory('source');
  eleventyConfig.setOutputDirectory('build');

  // Set directories to pass through to build directory
  eleventyConfig.addPassthroughCopy('source/assets/images');
}

// Set template engines
export const config = {
	markdownTemplateEngine: 'njk',
	htmlTemplateEngine: 'njk',
};
