const { createWebpackConfigAsync } = require('expo-yarn-workspaces/webpack');

module.exports = async function (env, argv) {
  const config = await createWebpackConfigAsync(env, argv);
  config.resolve.alias = {
    ...config.resolve.alias,
    'victory-native': 'victory',
  };
  // Customize the config before returning it.
  return config;
};
