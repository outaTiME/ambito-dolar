const { withAndroidStyles, AndroidConfig } = require('@expo/config-plugins');

module.exports = function (appConfig) {
  return withAndroidStyles(appConfig, function (decoratedAppConfig) {
    try {
      decoratedAppConfig.modResults = AndroidConfig.Styles.assignStylesValue(
        decoratedAppConfig.modResults,
        {
          add: true,
          parent: AndroidConfig.Styles.getAppThemeLightNoActionBarGroup(),
          name: 'android:windowBackground',
          value: '@drawable/splashscreen',
        },
      );
    } catch (e) {
      console.error('withAndroidStylesWindowBackground failed', e);
    }
    return decoratedAppConfig;
  });
};
