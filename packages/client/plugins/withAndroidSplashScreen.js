const { withStringsXml, AndroidConfig } = require('@expo/config-plugins');

module.exports = function (appConfig) {
  return withStringsXml(appConfig, function (decoratedAppConfig) {
    try {
      decoratedAppConfig.modResults = AndroidConfig.Strings.setStringItem(
        [
          {
            $: {
              name: 'expo_splash_screen_status_bar_translucent',
              translatable: 'false',
            },
            _: 'true',
          },
        ],
        decoratedAppConfig.modResults,
      );
    } catch (e) {
      console.error('withAndroidSplashScreen failed', e);
    }
    return decoratedAppConfig;
  });
};
