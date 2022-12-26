/** @type {import('next').NextConfig} */

// const rehypePrism = require("@mapbox/rehype-prism");
// const remarkSnippets = require("remark-snippets");

/*
const nextConfig = require("next-mdx-enhanced")({
  fileExtensions: ["mdx", "md"],
  // rehypePlugins: [rehypePrism],
  // remarkPlugins: [require("remark-prism"), remarkSnippets],
  // rehypePlugins: [require("rehype-prism")],
});

const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.jsx",
});
*/

const remarkFrontmatter = import("remark-frontmatter");
const rehypeHighlight = import("rehype-highlight");
// import remarkFrontmatter from "remark-frontmatter";
// import rehypeHighlight from "rehype-highlight";
if (true) {
  const withMDX = require("@next/mdx")({
    extension: /\.mdx?$/,
    options: {
      // If you use remark-gfm, you'll need to use next.config.mjs
      // as the package is ESM only
      // https://github.com/remarkjs/remark-gfm#install
      remarkPlugins: [remarkFrontmatter],
      rehypePlugins: [rehypeHighlight],
      // If you use `MDXProvider`, uncomment the following line.
      // providerImportSource: "@mdx-js/react",
    },
  });
  const finalConfig = withMDX({
    // Append the default value with md extensions
    reactStrictMode: true,
    swcMinify: true,
    pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  });

  // If you have other Next.js configurations, you can pass them as the parameter:
  // module.exports = withNextra({ /* other next.js config */ })
  console.log("Final Config: ", finalConfig);
  module.exports = finalConfig;
} else {
  const finalConfig = {
    webpack: (config, options) => {
      config.module.rules.push({
        test: /\.mdx?$/,
        use: [
          options.defaultLoaders.babel,
          {
            loader: "@mdx-js/loader",
            options: {
              providerImportSource: "@mdx-js/react",
              remarkPlugins: [remarkFrontmatter],
              rehypePlugins: [rehypeHighlight],
            },
          },
        ],
      });

      return config;
    },
    swcMinify: true,
    reactStrictMode: true,
    pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  };

  module.export = finalConfig;
}
