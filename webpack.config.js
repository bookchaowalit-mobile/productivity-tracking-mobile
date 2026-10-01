const webpack = require('@nativescript/webpack');

module.exports = env => {
  webpack.init(env);

  // css-tree (via @nativescript/core) resolves the hoisted source-map@0.7,
  // which requires Node's `url` module only as a fallback for the URL global.
  // NativeScript provides URL, so stub `url` instead of failing the build.
  webpack.chainWebpack(config => {
    config.resolve.set('fallback', {url: false});
  });

  return webpack.resolveConfig();
};
