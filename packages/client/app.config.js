const version = '9.0.2';
const buildNumber = 170;

const IS_NEW_ARCH_ENABLED = false;

export default {
  name: 'Ámbito Dólar',
  slug: 'ambito-dolar',
  runtimeVersion: version,
  version,
  platforms: ['android', 'ios', 'web'],
  githubUrl:
    'https://github.com/outaTiME/ambito-dolar/tree/master/packages/client',
  // orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  androidStatusBar: {
    barStyle: 'light-content',
  },
  // Dark nav bar in light mode is better than light nav bar in dark mode
  androidNavigationBar: {
    barStyle: 'light-content',
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
    revenueCat: {
      ios: process.env.REVENUECAT_IOS_API_KEY,
      android: process.env.REVENUECAT_ANDROID_API_KEY,
    },
    instantApiId: process.env.INSTANT_APP_ID,
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
  plugins: [
    'expo-localization',
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/FiraGO-Regular.otf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Brands.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Solid.ttf',
        ],
      },
    ],
    Boolean(process.env.SENTRY_AUTH_TOKEN) && [
      '@sentry/react-native/expo',
      {
        organization: 'ambito-dolar',
        project: 'expo',
      },
    ],
    [
      'expo-quick-actions',
      {
        iosActions: [
          {
            id: 'Conversion',
            title: 'Conversor',
            icon: 'compose',
          },
        ],
      },
    ],
    false && [
      'react-native-android-widget',
      {
        fonts: ['./assets/fonts/FiraGO-Regular.otf'],
        widgets: [
          {
            name: 'Rate',
            // https://developer.android.com/guide/practices/ui_guidelines/widget_design?hl=es-419
            // 70 * n − 30 (2x2)
            minWidth: '110dp',
            minHeight: '110dp',
            label: 'Cotizaciones',
            description:
              'Mantenete al tanto de las cotizaciones durante el transcurso del día.',
            targetCellWidth: 2,
            targetCellHeight: 2,
            previewImage: './assets/widgets/android-2x2.png',
            resizeMode: 'none',
            widgetFeatures: 'reconfigurable|configuration_optional',
            // https://saleksovski.github.io/react-native-android-widget/docs/public-api/interfaces/Widget#updateperiodmillis
            updatePeriodMillis: 30 * 60 * 1000,
          },
        ],
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/splash-icon.png',
        dark: {
          backgroundColor: '#000000',
          image: './assets/splash-icon-dark.png',
        },
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.notification.png',
        color: '#00AE6B',
      },
    ],
    [
      'react-native-edge-to-edge',
      {
        android: {
          parentTheme: 'Light',
          enforceNavigationBarContrast: false,
        },
      },
    ],
  ].filter(Boolean),
  newArchEnabled: IS_NEW_ARCH_ENABLED,
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
      // CFBundleLocalizations: ['es-419'],
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
        'x',
        'tg',
        'instagram',
        'fb',
        'reddit',
        'github',
        'ivory',
        'mastodon',
        'bluesky',
        'barcelona',
        // required for app store review
        'itms-apps',
      ],
      UIViewControllerBasedStatusBarAppearance: true,
      // optimizes ProMotion refresh rates
      CADisableMinimumFrameDurationOnPhone: true,
    },
    privacyManifests: {
      // https://docs.sentry.io/platforms/react-native/data-management/apple-privacy-manifest/#create-privacy-manifest-in-expo
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeCrashData',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
          ],
        },
        {
          NSPrivacyCollectedDataType:
            'NSPrivacyCollectedDataTypePerformanceData',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
          ],
        },
        {
          NSPrivacyCollectedDataType:
            'NSPrivacyCollectedDataTypeOtherDiagnosticData',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            'NSPrivacyCollectedDataTypePurposeAppFunctionality',
          ],
        },
      ],
      // https://github.com/bluesky-social/social-app/blob/main/app.config.js#L103
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1', '3B52.1', '0A2A.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
        },
        {
          NSPrivacyAccessedAPIType:
            'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1', '1C8F.1'],
        },
      ],
    },
  },
  android: {
    package: 'im.outa.AmbitoDolar',
    versionCode: buildNumber,
    icon: './assets/icon.android.png',
    adaptiveIcon: {
      foregroundImage: './assets/icon.android.adaptive.foreground.png',
      monochromeImage: './assets/icon.android.adaptive.foreground.png',
      backgroundImage: './assets/icon.android.adaptive.background.png',
    },
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=im.outa.AmbitoDolar',
    permissions: [],
    // permissions: ['com.google.android.gms.permission.AD_ID'],
    ...(process.env.GOOGLE_SERVICES_FILE && {
      googleServicesFile: process.env.GOOGLE_SERVICES_FILE,
    }),
    // prevents restore of auto-generated IDs
    allowBackup: false,
  },
};
