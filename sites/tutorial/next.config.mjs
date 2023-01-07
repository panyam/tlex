/** @type {import('next').NextConfig} */
import nextMDX from '@next/mdx';

//const withPlugins = require('next-compose-plugins');
// const unified = import("unified");


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

import remarkFrontmatter  from "remark-frontmatter";
// const rehypeHighlight = import("rehype-highlight");
import rehypeHighlight from "rehype-highlight";
import remarkSnippets from "remark-snippets"; // const remarkSnippets = import("remark-snippets");
// import remarkFrontmatter from "remark-frontmatter";
// import rehypeHighlight from "rehype-highlight";
const withMDX = nextMDX({
  options: {
    // If you use remark-gfm, you'll need to use next.config.mjs
    // as the package is ESM only
    // https://github.com/remarkjs/remark-gfm#install

    // remarkPlugins: [remarkFrontmatter],
    // rehypePlugins: [rehypeHighlight],
    remarkPlugins: [
      remarkFrontmatter,
      [remarkSnippets, {
        /**
         * Address of the snippet service to be invokved to run our snippets.
         */
        snippetsvc: {
          addr: "localhost:7000", // default
        },
        /**
         * Different environments that can be used so they dont have to
         * be defined in the mdx files.  These environments can be overridden
         * in specific mdx files and new ones can also be created.
         */
        envinfo: {
          default: "default",
          envs: [{
            name: "default",
            packages: [{
              "tlex": "*",
            }],
          }],
        },
        foo: "bar",
      }],
    ],
    rehypePlugins: [rehypeHighlight],

    // If you use `MDXProvider`, uncomment the following line.
    // providerImportSource: "@mdx-js/react",
  },
});
const finalConfig = withMDX({
  // Append the default value with md extensions
  basePath: "/tutorial",
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  productionBrowserSourceMaps: true,
  distDir: "build",
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
   webpack: (config, { isServer }) => {
        if (!isServer) {
            // don't resolve 'fs' module on the client to prevent this error on build --> Error: Can't resolve 'fs'
            config.resolve.fallback = {
                fs: false
            }
        }

        return config;
    },
});

// If you have other Next.js configurations, you can pass them as the parameter:
// module.exports = withNextra({ /* other next.js config */ })
console.log("Final Config: ", finalConfig);
export default finalConfig; // module.exports = finalConfig;
