const { AndroidConfig, withStringsXml } = require('expo/config-plugins');

// the launcher label keeps the accents while the app name stays ascii, expo/eas-cli#4715
module.exports = function withAndroidAppName(appConfig, name) {
  return withStringsXml(appConfig, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: 'app_name' }, _: name }],
      config.modResults,
    );
    return config;
  });
};
