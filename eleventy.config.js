export default function (eleventyConfig) {

  // Set source and build directories
  eleventyConfig.setInputDirectory('source');
	eleventyConfig.setOutputDirectory('build');
}

// Set template engines
export const config = {
	markdownTemplateEngine: 'njk',
	htmlTemplateEngine: 'njk',
};
