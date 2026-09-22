const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');

const config = getSentryExpoConfig(__dirname);

config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  // resolved and not joined, the package is hoisted and does not sit here
  'victory-native': path.dirname(require.resolve('victory/package.json')),
};

module.exports = config;
