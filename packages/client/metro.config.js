/* eslint-env node */
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');

const config = getSentryExpoConfig(__dirname);

config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'victory-native': path.resolve(__dirname, 'node_modules/victory'),
};

module.exports = config;
