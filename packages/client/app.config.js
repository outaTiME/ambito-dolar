import 'dotenv/config';

const version = '5.1.0';
const buildNumber = 53;

export default {
  name: 'Ámbito Dólar',
  slug: 'ambito-dolar',
  privacy: 'hidden',
  platforms: ['android', 'ios', 'web'],
  version,
  orientation: 'portrait',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash-dark-content.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'im.outa.AmbitoDolar',
    buildNumber: buildNumber.toString(),
    infoPlist: {
      CFBundleDevelopmentRegion: 'es',
      UISupportedInterfaceOrientations: ['UIInterfaceOrientationPortrait'],
      'UISupportedInterfaceOrientations~ipad': [
        'UIInterfaceOrientationLandscapeLeft',
        'UIInterfaceOrientationLandscapeRight',
      ],
      UIRequiresFullScreen: true,
      LSApplicationQueriesSchemes: ['twitter', 'tg', 'instagram', 'fb'],
    },
    supportsTablet: true,
    config: {
      usesNonExemptEncryption: false,
    },
    appStoreUrl: 'https://apps.apple.com/app/id1485120819',
  },
  android: {
    package: 'im.outa.AmbitoDolar',
    versionCode: buildNumber,
    googleServicesFile: './google-services.json',
    icon: './assets/icon.android.png',
    adaptiveIcon: {
      foregroundImage: './assets/icon.android.adaptive.foreground.png',
      backgroundImage: './assets/icon.android.adaptive.background.png',
    },
    permissions: [],
    allowBackup: false,
    softwareKeyboardLayoutMode: 'pan',
    useNextNotificationsApi: true,
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=im.outa.AmbitoDolar',
  },
  notification: {
    icon: './assets/icon.notification.png',
    color: '#2ECC71',
  },
  hooks: {
    postPublish: [
      {
        file: 'sentry-expo/upload-sourcemaps',
        config: JSON.parse(process.env.SENTRY_HOOK_CONFIG_JSON),
      },
    ],
  },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ['**/*'],
};
