/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  distDir: "build",
  trailingSlash: true,
  productionBrowserSourceMaps: true,
  basePath: "/demo",
};

module.exports = nextConfig;
