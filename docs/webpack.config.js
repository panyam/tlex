const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

// This should match the PathPrefix in main.go
const SITE_PATH_PREFIX = "/tlex";

module.exports = (_env, options) => {
  const isDevelopment = options.mode == "development";
  return {
    devtool: "source-map",
    entry: {
      DocsPage: path.join(__dirname, "./components/DocsPage.ts"),
      PlaygroundPage: path.join(__dirname, "./components/playground/PlaygroundPage.ts"),
      ExampleRunner: path.join(__dirname, "./components/ExampleRunner.ts"),
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: [path.resolve(__dirname, "node_modules"), path.resolve(__dirname, "dist")],
          use: ["babel-loader"],
        },
        {
          test: /\.ts$/,
          exclude: [path.resolve(__dirname, "node_modules"), path.resolve(__dirname, "dist")],
          include: [path.resolve(__dirname, "components")],
          use: [
            {
              loader: "ts-loader",
              options: { configFile: "tsconfig.json" },
            },
          ],
        },
        {
          test: /\.s?css$/,
          use: ["style-loader", "css-loader", "sass-loader"],
        },
      ],
    },
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx", ".scss", ".css"],
      fallback: {
        assert: false,
        child_process: false,
        crypto: false,
        fs: false,
        http: false,
        https: false,
        net: false,
        os: false,
        path: false,
        querystring: false,
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer"),
        tls: false,
        url: false,
        util: false,
        zlib: false,
      },
    },
    output: {
      path: path.resolve(__dirname, "./static/js/gen/"),
      publicPath: SITE_PATH_PREFIX + "/static/js/gen/",
      filename: "[name].[contenthash].js",
      library: ["tlex", "[name]"],
      libraryTarget: "umd",
      umdNamedDefine: true,
      globalObject: "this",
    },
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
      }),
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        chunks: ["DocsPage"],
        filename: path.resolve(__dirname, "./templates/gen.DocsPage.html"),
        templateContent: ({ htmlWebpackPlugin }) =>
          htmlWebpackPlugin.tags.headTags
            .filter(tag => tag.tagName === 'script')
            .map(tag => `<script defer src="${tag.attributes.src}"></script>`)
            .join('\n'),
        inject: false,
        minify: { collapseWhitespace: false },
      }),
      new HtmlWebpackPlugin({
        chunks: ["PlaygroundPage"],
        filename: path.resolve(__dirname, "./templates/gen.PlaygroundPage.html"),
        templateContent: ({ htmlWebpackPlugin }) =>
          htmlWebpackPlugin.tags.headTags
            .filter(tag => tag.tagName === 'script')
            .map(tag => `<script defer src="${tag.attributes.src}"></script>`)
            .join('\n'),
        inject: false,
        minify: { collapseWhitespace: false },
      }),
      new HtmlWebpackPlugin({
        chunks: ["ExampleRunner"],
        filename: path.resolve(__dirname, "./templates/gen.ExampleRunner.html"),
        templateContent: ({ htmlWebpackPlugin }) =>
          htmlWebpackPlugin.tags.headTags
            .filter(tag => tag.tagName === 'script')
            .map(tag => `<script defer src="${tag.attributes.src}"></script>`)
            .join('\n'),
        inject: false,
        minify: { collapseWhitespace: false },
      }),
    ],
    optimization: {
      splitChunks: {
        chunks: "all",
      },
    },
    performance: {
      maxAssetSize: 500000,
      maxEntrypointSize: 800000,
    },
  };
};
