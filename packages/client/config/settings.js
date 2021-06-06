import Constants from 'expo-constants';
import { Dimensions, Platform } from 'react-native';
import { human, iOSColors } from 'react-native-typography';

export const PADDING = 16;
export const HEADER_HEIGHT = 54 + Constants.statusBarHeight;
const { height: DEVICE_HEIGHT, width: DEVICE_WIDTH } = Dimensions.get('window');
export const SMALL_DISPLAY_HEIGHT = Math.round(DEVICE_HEIGHT) <= 731; // 5.0"
const EXTRA_MARGIN_ON_LARGE_DISPLAY = true;
export const CARD_PADDING =
  Platform.OS === 'web'
    ? PADDING - PADDING / 4
    : !SMALL_DISPLAY_HEIGHT && EXTRA_MARGIN_ON_LARGE_DISPLAY
    ? PADDING / 1.5
    : PADDING / 2;
export const BORDER_RADIUS = PADDING / 2;
export const BORDER_WIDTH = 1;
export const ALLOW_FONT_SCALING = false;
export const REGISTER_DEVICE_URI = process.env.REGISTER_DEVICE_URI;
export const RATES_URI = process.env.RATES_URI;
export const HISTORICAL_RATES_URI = process.env.HISTORICAL_RATES_URI;
export const SENTRY_URI = process.env.SENTRY_URI;
export const AMPLITUDE_KEY = process.env.AMPLITUDE_KEY;
export const FETCH_TIMEOUT = 30 * 1000; // 30 secs
export const FETCH_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 mins
export const BULLET_SEPARATOR = '•';
export const SPACE_SEPARATOR = ' ';
export const FIGURE_SPACE_SEPARATOR = ' ';
export const DASH_SEPARATOR = '‒';
export const EM_DASH_SEPARATOR = '—';
export const MAX_LOADS_FOR_REVIEW = 5;
export const MAX_NUMBER_OF_STATS = 7; // 1 week
export const STILL_LOADING_TIMEOUT = 10 * 1000; // 10 secs
export const ANIMATION_DURATION = 250;
// same as header fonts.title size
export const ICON_SIZE = 24;
export const APP_IGNORE_UPDATE_EXPIRATION = 30 * 24 * 60 * 60 * 1000; // 30 days
export const { name: APP_NAME, android } = Constants.manifest;
export const APP_COPYRIGHT = `© ${new Date().getFullYear()} ${APP_NAME}`;
export const APP_DOMAIN = 'ambito-dolar.app';
export const APP_STORE_URI =
  Platform.OS === 'ios'
    ? `itms-apps://itunes.apple.com/app/id1485120819`
    : `market://details?id=${Constants.manifest.android?.package}`;
export const APP_REVIEW_URI = `${APP_STORE_URI}${
  Platform.OS === 'ios' ? '?action=write-review' : '&showAllReviews=true'
}`;
export const HIT_SLOP = {
  top: PADDING,
  bottom: PADDING,
  right: PADDING,
  left: PADDING,
};
export const CHART_STROKE_WIDTH = 3 - 0.5;
// iPad in landscape
export const MAX_DEVICE_WIDTH = 551 + CARD_PADDING * 2;
export const INITIAL_ROUTE_NAME = 'Main';

export default {
  PADDING,
  HEADER_HEIGHT,
  DEVICE_HEIGHT,
  DEVICE_WIDTH,
  SMALL_DISPLAY_HEIGHT,
  CARD_PADDING,
  BORDER_RADIUS,
  BORDER_WIDTH,
  ALLOW_FONT_SCALING,
  REGISTER_DEVICE_URI,
  RATES_URI,
  HISTORICAL_RATES_URI,
  SENTRY_URI,
  AMPLITUDE_KEY,
  FETCH_TIMEOUT,
  FETCH_REFRESH_INTERVAL,
  BULLET_SEPARATOR,
  SPACE_SEPARATOR,
  FIGURE_SPACE_SEPARATOR,
  DASH_SEPARATOR,
  EM_DASH_SEPARATOR,
  MAX_LOADS_FOR_REVIEW,
  MAX_NUMBER_OF_STATS,
  STILL_LOADING_TIMEOUT,
  ANIMATION_DURATION,
  ICON_SIZE,
  APP_IGNORE_UPDATE_EXPIRATION,
  APP_NAME,
  APP_COPYRIGHT,
  APP_DOMAIN,
  APP_STORE_URI,
  APP_REVIEW_URI,
  HIT_SLOP,
  CHART_STROKE_WIDTH,
  MAX_DEVICE_WIDTH,
  INITIAL_ROUTE_NAME,
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
  getBackgroundColor(theme, alternative = false) {
    if (theme === 'dark') {
      return this.getDarkColor();
    }
    return this.getLightColor(alternative);
  },
  getContentColor(theme, alternative = false) {
    // systemGray6
    if (theme === 'dark') {
      return 'rgb(28,28,30)';
    }
    return this.getLightColor(!alternative);
  },
  getStrokeColor(theme, soft) {
    if (soft === true) {
      // systemGray5
      if (theme === 'dark') {
        return 'rgb(44,44,46)';
      }
      return 'rgb(229,229,234)';
    }
    // systemGray4
    if (theme === 'dark') {
      return 'rgb(58,58,60)';
    }
    return 'rgb(209,209,214)';
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
