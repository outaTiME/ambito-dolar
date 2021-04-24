module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@rainbow-me/animated-charts': [
              './react-native-animated-charts/src',
            ],
          },
        },
      ],
      'inline-dotenv',
      'react-native-reanimated/plugin',
    ],
  };
};
