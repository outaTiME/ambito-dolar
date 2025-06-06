import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform, Dimensions } from 'react-native';
import { human, iOSColors } from 'react-native-typography';

const PADDING = 16;
const SMALL_PADDING = PADDING / 4;

const DEVICE_TYPE = Device.deviceType;
const IS_TABLET = DEVICE_TYPE === Device.DeviceType.TABLET;
const IS_HANDSET = DEVICE_TYPE === Device.DeviceType.PHONE;
const IS_IPAD = Platform.OS === 'ios' && IS_TABLET;
const HAPTICS_ENABLED = Platform.OS === 'ios';

// FIXME: check use width on tablets ?
// const SMALL_DISPLAY_HEIGHT = Math.round(IS_HANDSET ? DEVICE_HEIGHT : DEVICE_WIDTH) <= 731; // 5.0"
const EXTRA_MARGIN_ON_LARGE_DISPLAY = true;
const BORDER_RADIUS = PADDING / 2;
// const BORDER_RADIUS = 12;
const BORDER_WIDTH = 1;
const MAX_FONT_SIZE_MULTIPLIER = 1.2;
const FETCH_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 mins
const BULLET_SEPARATOR = '•';
const SPACE_SEPARATOR = ' ';
const FIGURE_SPACE_SEPARATOR = ' ';
const DASH_SEPARATOR = '‒';
const EM_DASH_SEPARATOR = '—';
const MAX_DAYS_FOR_REVIEW = 5;
// TODO: leave 6 days like "Ámbito Financiero" website?
const MAX_NUMBER_OF_STATS = 6; // 1 week
const STILL_LOADING_TIMEOUT = 10 * 1000; // 10 secs
const ANIMATION_DURATION = 250;
// half from longPress default
// const INTERACTION_DELAY = 185;
const INTERACTION_DELAY = 120;
// same as header fonts.title size
const ICON_SIZE = 24;
const SOCIAL_ICON_SIZE = 17;
const {
  expoConfig: {
    name: APP_NAME,
    version: APP_VERSION,
    // empty on web
    android: { package: ANDROID_APP_ID } = {},
    extra: {
      ratesUri: RATES_URI,
      historicalRatesUri: HISTORICAL_RATES_URI,
      sentryDsn: SENTRY_DSN,
      amplitudeKey: AMPLITUDE_KEY,
      firebaseConfigJson: FIREBASE_CONFIG_JSON,
      isProduction: IS_PRODUCTION,
      apiUrl: API_URL,
      revenueCat: {
        ios: REVENUECAT_IOS_API_KEY,
        android: REVENUECAT_ANDROID_API_KEY,
      },
      instantApiId: INSTANT_APP_ID,
    },
  },
} = Constants;
// force local fixtures
// const RATES_URI = null;
// const HISTORICAL_RATES_URI = null;
// const INSTANT_APP_ID = null;
const APP_COPYRIGHT = `© ${new Date().getFullYear()} ${APP_NAME}`;
const APP_DOMAIN = 'ambito-dolar.app';
const WEBSITE_URL = `https://${APP_DOMAIN}`;
const APP_STORE_URI =
  Platform.OS === 'ios'
    ? `itms-apps://itunes.apple.com/app/id1485120819`
    : `market://details?id=${ANDROID_APP_ID}`;
const APP_REVIEW_URI = `${APP_STORE_URI}${
  Platform.OS === 'ios' ? '?action=write-review' : '&showAllReviews=true'
}`;
const CAFECITO_URL = 'https://cafecito.app/ambitodolar';
const HIT_SLOP = {
  top: PADDING,
  bottom: PADDING,
  right: PADDING,
  left: PADDING,
};
const CHART_STROKE_WIDTH = 3 - 0.5;
const MAIN_ROUTE_NAME = 'Main';

const Settings = {
  PADDING,
  SMALL_PADDING,
  BORDER_RADIUS,
  BORDER_WIDTH,
  MAX_FONT_SIZE_MULTIPLIER,
  RATES_URI,
  HISTORICAL_RATES_URI,
  SENTRY_DSN,
  AMPLITUDE_KEY,
  FIREBASE_CONFIG_JSON,
  IS_PRODUCTION: Platform.OS === 'web' ? IS_PRODUCTION : !__DEV__,
  API_URL,
  REVENUECAT_API_KEY: Platform.select({
    ios: REVENUECAT_IOS_API_KEY,
    android: REVENUECAT_ANDROID_API_KEY,
  }),
  INSTANT_APP_ID,
  FETCH_REFRESH_INTERVAL,
  BULLET_SEPARATOR,
  SPACE_SEPARATOR,
  FIGURE_SPACE_SEPARATOR,
  DASH_SEPARATOR,
  EM_DASH_SEPARATOR,
  MAX_DAYS_FOR_REVIEW,
  MAX_NUMBER_OF_STATS,
  STILL_LOADING_TIMEOUT,
  ANIMATION_DURATION,
  INTERACTION_DELAY,
  ICON_SIZE,
  SOCIAL_ICON_SIZE,
  APP_NAME,
  APP_VERSION,
  APP_COPYRIGHT,
  APP_DOMAIN,
  WEBSITE_URL,
  APP_STORE_URI,
  APP_REVIEW_URI,
  CAFECITO_URL,
  HIT_SLOP,
  CHART_STROKE_WIDTH,
  INITIAL_ROUTE_NAME: MAIN_ROUTE_NAME,
  IS_TABLET,
  IS_HANDSET,
  IS_IPAD,
  HAPTICS_ENABLED,
  // https://sarunw.com/posts/dark-color-cheat-sheet/
  // https://noahgilmore.com/blog/dark-mode-uicolor-compatibility/
  getLightColor(alternative = false) {
    if (alternative !== false) {
      return iOSColors.white;
    }
    return iOSColors.customGray;
  },
  getDarkColor() {
    return iOSColors.black;
  },
  getForegroundColor(theme) {
    if (theme === 'dark') {
      return this.getLightColor();
    }
    return this.getDarkColor();
  },
  getBackgroundColor(theme, alternative = false, modal = false) {
    if (theme === 'dark') {
      if (modal && Platform.OS === 'ios' /* && IS_IPAD */) {
        // systemGray6
        return 'rgb(28,28,30)';
      }
      return this.getDarkColor();
    }
    return this.getLightColor(alternative);
  },
  getContentColor(theme, alternative = false, modal = false) {
    if (theme === 'dark') {
      if (modal && Platform.OS === 'ios' /* && IS_IPAD */) {
        // systemGray5
        return 'rgb(44,44,46)';
      }
      // systemGray6
      return 'rgb(28,28,30)';
    }
    return this.getLightColor(!alternative);
  },
  getStrokeColor(theme, soft = false, modal = false) {
    if (soft === true) {
      if (theme === 'dark') {
        if (modal && Platform.OS === 'ios' /* && IS_IPAD */) {
          // systemGray4
          return 'rgb(58,58,60)';
        }
        // systemGray5
        return 'rgb(44,44,46)';
      }
      // systemGray5
      return 'rgb(229,229,234)';
    }
    if (theme === 'dark') {
      if (modal && Platform.OS === 'ios' /* && IS_IPAD */) {
        // systemGray3
        return 'rgb(72,72,74)';
      }
      // systemGray4
      return 'rgb(58,58,60)';
      // return 'rgba(56, 56, 58, 1.0)';
    }
    // systemGray4
    return 'rgb(209,209,214)';
    // return 'rgba(198, 198, 200, 1.0)';
  },
  // adapt to the current appearance (dynamic colors on ios)
  getSeparatorColor(theme) {
    if (Platform.OS === 'ios') {
      if (theme === 'dark') {
        return 'rgba(84, 84, 88, 0.6)';
        // return 'rgba(255,255,255,0.15)';
      }
      return 'rgba(60, 60, 67, 0.29)';
      // return 'rgba(0,0,0,0.25)';
    }
    return this.getStrokeColor(theme);
  },
  // chart colors
  getBlueColor(theme) {
    if (theme === 'dark') {
      return 'rgb(10,132,255)';
    }
    return 'rgb(0,122,255)';
  },
  getGreenColor(theme) {
    if (theme === 'dark') {
      return 'rgb(48,209,88)';
    }
    return 'rgb(52,199,89)';
  },
  getRedColor(theme) {
    if (theme === 'dark') {
      return 'rgb(255,69,58)';
    }
    return 'rgb(255,59,48)';
  },
  getGrayColor() {
    return 'rgb(142,142,147)';
  },
  getFontObject(theme, name) {
    if (theme && name) {
      if (theme === 'dark') {
        name += 'White';
      }
      name += 'Object';
    }
    return {
      ...(name && human[name]),
      fontFamily: 'FiraGO-Regular',
      letterSpacing: undefined,
    };
  },
};

export function updateSettings({ width, height } = Dimensions.get('window')) {
  const SMALL_DISPLAY_HEIGHT = Math.round(height) <= 731; // ej: menos de 5.0"
  // use 50% of landscape viewing area on tablets
  const MAX_CONTENT_WIDTH = IS_HANDSET ? width : width * 0.5;
  const CONTENT_WIDTH = Math.min(width, MAX_CONTENT_WIDTH);
  const CARD_PADDING =
    Platform.OS === 'web' ||
    (!SMALL_DISPLAY_HEIGHT && EXTRA_MARGIN_ON_LARGE_DISPLAY)
      ? 10
      : PADDING / 2;
  // https://github.com/nirsky/react-native-size-matters/blob/master/lib/scaling-utils.js#L7
  const guidelineBaseWidth = 350;
  const scale = (size) => (CONTENT_WIDTH / guidelineBaseWidth) * size;
  const moderateScale = (size, factor = 0.5) =>
    size + (scale(size) - size) * factor;
  // set global layout values before UI mounts
  Object.assign(Settings, {
    DEVICE_WIDTH: width,
    CONTENT_WIDTH,
    CARD_PADDING,
    moderateScale,
  });
}

// update layout defaults at module load time
updateSettings();

export default Settings;
