const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function (appConfig) {
  return withAndroidManifest(appConfig, function (decoratedAppConfig) {
    try {
      decoratedAppConfig.modResults.manifest.application[0].$[
        'android:largeHeap'
      ] = 'true';
    } catch (e) {
      console.error('withAndroidManifest failed', e);
    }
    return decoratedAppConfig;
  });
};
