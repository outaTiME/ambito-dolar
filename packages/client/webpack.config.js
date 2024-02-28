const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  // Customize the config before returning it.
  config.resolve.alias = {
    ...config.resolve.alias,
    'victory-native': 'victory',
  };
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: false,
  };
  return config;
};
