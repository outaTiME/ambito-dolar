import 'dotenv/config';

const version = '6.9.0';
const buildNumber = 107;
const hasSentryToken = !!process.env.SENTRY_AUTH_TOKEN;

const LIGHT_SPLASH = {
  image: './assets/splash-light.png',
  backgroundColor: '#FFFFFF',
};

const DARK_SPLASH = {
  image: './assets/splash-dark.png',
  backgroundColor: '#000000',
};

const SHARED_SPLASH = {
  splash: {
    ...LIGHT_SPLASH,
    dark: {
      ...DARK_SPLASH,
    },
  },
};

export default {
  name: 'Ámbito Dólar',
  slug: 'ambito-dolar',
  privacy: 'hidden',
  runtimeVersion: {
    policy: 'appVersion',
  },
  version,
  platforms: ['android', 'ios', 'web'],
  githubUrl:
    'https://github.com/outaTiME/ambito-dolar/tree/master/packages/client',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  notification: {
    icon: './assets/icon.notification.png',
    color: '#00AE6B',
  },
  // https://github.com/expo/expo/issues/11604#issuecomment-1018355394
  androidStatusBar: {
    backgroundColor: '#00000000',
    barStyle: 'dark-content',
  },
  scheme: 'ambito-dolar',
  extra: {
    ratesUri: process.env.RATES_URI,
    historicalRatesUri: process.env.HISTORICAL_RATES_URI,
    sentryDsn: process.env.SENTRY_DSN,
    amplitudeKey: process.env.AMPLITUDE_KEY,
    firebaseConfigJson: process.env.FIREBASE_CONFIG_JSON,
    isProduction: process.env.IS_PRODUCTION === 'true',
    apiUrl: process.env.SST_API_URL ?? process.env.API_URL,
    eas: {
      projectId: '88dc0a10-eec5-11e8-bdb0-e9d94f6dfa7d',
      build: {
        experimental: {
          ios: {
            appExtensions: [
              {
                targetName: 'RateWidgetsExtension',
                bundleIdentifier: 'im.outa.AmbitoDolar.RateWidgets',
              },
              {
                targetName: 'RateIntents',
                bundleIdentifier: 'im.outa.AmbitoDolar.RateIntents',
              },
            ],
          },
        },
      },
    },
  },
  updates: {
    enabled: false,
    url: 'https://u.expo.dev/88dc0a10-eec5-11e8-bdb0-e9d94f6dfa7d',
  },
  assetBundlePatterns: ['**/*'],
  plugins: [
    'expo-localization',
    hasSentryToken && 'sentry-expo',
    [
      '@config-plugins/react-native-quick-actions',
      [
        {
          title: 'Conversor',
          type: 'Conversion',
          // iconType: 'UIApplicationShortcutIconTypeSearch',
          iconType: 'UIApplicationShortcutIconTypeCompose',
        },
      ],
    ],
    // https://www.aronberezkin.com/posts/a-step-by-step-guide-to-writing-your-first-expo-config-plugin
    './plugins/withAndroidSplashScreen.js',
  ].filter(Boolean),
  splash: LIGHT_SPLASH,
  ios: {
    bundleIdentifier: 'im.outa.AmbitoDolar',
    buildNumber: buildNumber.toString(),
    appStoreUrl: 'https://apps.apple.com/app/id1485120819',
    config: {
      usesNonExemptEncryption: false,
    },
    supportsTablet: true,
    requireFullScreen: true,
    infoPlist: {
      CFBundleDevelopmentRegion: 'es-419',
      // https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/AboutInformationPropertyListFiles.html#//apple_ref/doc/uid/TP40009254-SW9
      'UISupportedInterfaceOrientations~iphone': [
        'UIInterfaceOrientationPortrait',
      ],
      'UISupportedInterfaceOrientations~ipad': [
        'UIInterfaceOrientationLandscapeLeft',
        'UIInterfaceOrientationLandscapeRight',
      ],
      LSApplicationQueriesSchemes: [
        'twitter',
        'tg',
        'instagram',
        'fb',
        'reddit',
        'github',
        'ivory',
        'mastodon',
        'itms-apps',
      ],
      UIViewControllerBasedStatusBarAppearance: true,
      // optimizes ProMotion refresh rates
      CADisableMinimumFrameDurationOnPhone: true,
    },
    ...SHARED_SPLASH,
  },
  android: {
    package: 'im.outa.AmbitoDolar',
    versionCode: buildNumber,
    icon: './assets/icon.android.png',
    adaptiveIcon: {
      foregroundImage: './assets/icon.android.adaptive.foreground.png',
      backgroundImage: './assets/icon.android.adaptive.background.png',
    },
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=im.outa.AmbitoDolar',
    permissions: [],
    ...(process.env.GOOGLE_SERVICES_FILE && {
      googleServicesFile: process.env.GOOGLE_SERVICES_FILE,
    }),
    ...SHARED_SPLASH,
    allowBackup: false,
    softwareKeyboardLayoutMode: 'pan',
  },
  hooks: {
    postPublish: [
      {
        file: 'sentry-expo/upload-sourcemaps',
        config: {
          organization: 'ambito-dolar',
          project: 'expo',
          // https://github.com/expo/sentry-expo/issues/256#issuecomment-1164017755
          // authToken: false,
        },
      },
    ],
  },
};
