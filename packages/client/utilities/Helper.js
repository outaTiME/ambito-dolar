import AmbitoDolar from '@ambito-dolar/core';
import { useHeaderHeight } from '@react-navigation/elements';
import { createNavigationContainerRef } from '@react-navigation/native';
import rgba from 'color-rgba';
import * as d3Array from 'd3-array';
import * as Application from 'expo-application';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import * as _ from 'lodash';
import React from 'react';
import { Platform, Linking, PixelRatio } from 'react-native';
import { useSelector, shallowEqual } from 'react-redux';
import { createSelector } from 'reselect';
import semverCoerce from 'semver/functions/coerce';
import semverDiff from 'semver/functions/diff';
import semverGt from 'semver/functions/gt';
import semverValid from 'semver/functions/valid';
import { ThemeContext } from 'styled-components';
import useSWR from 'swr';

import rates from '../assets/rates.json';
import I18n from '../config/I18n';
import Settings from '../config/settings';

const getNotificationSettings = (notification_settings, value, type) => {
  notification_settings = AmbitoDolar.getNotificationSettings(
    notification_settings,
  );
  let setting =
    typeof value === 'boolean'
      ? {
          enabled: value,
        }
      : value;
  if (type) {
    setting = {
      [type]: setting,
    };
  }
  return _.merge(notification_settings, setting);
};

const getNotificationSettingsSelector = createSelector(
  ({ application }) => application.notification_settings,
  (notification_settings) => getNotificationSettings(notification_settings),
);

const debug = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

const getJson = (url, opts = {}) => {
  debug('Get json', url, opts);
  return AmbitoDolar.fetch(url, {
    // method: 'GET',
    headers: {
      // Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    ...opts,
  }).then((response) => response.json());
  /* .then((data) => {
      console.log('>>> data', data);
      return data;
    }); */
};

const FRACTION_DIGITS = AmbitoDolar.FRACTION_DIGITS;

const formatNumber = AmbitoDolar.formatNumber;

const formatRateCurrency = AmbitoDolar.formatRateCurrency;

const formatRateChange = AmbitoDolar.formatRateChange;

const formatCurrency = AmbitoDolar.formatCurrency;

// https://github.com/realadvisor/rifm/blob/master/pages/number-format/index.js#L39

const formatFloatingPointNumber = (value, maxDigits = FRACTION_DIGITS) => {
  if (typeof value === 'number') {
    return formatNumber(value, maxDigits, false);
  }
  // handles delimiter updates due to system settings or initial boot
  const { decimal: decimalSeparator } = AmbitoDolar.getDelimiters();
  const numberAccept = new RegExp(`[\\d${decimalSeparator}]+`, 'g');
  const parsed = (value.match(numberAccept) || []).join('');
  let [head, tail] = parsed.split(decimalSeparator);
  // add 0 on head when value starts with decimalSeparator
  if (parsed.indexOf(decimalSeparator) === 0) {
    head = 0;
  }
  // avoid rounding errors at toLocaleString as when user enters 1.239 and maxDigits=2 we
  // must not to convert it to 1.24, it must stay 1.23
  const scaledTail = tail != null ? tail.slice(0, maxDigits) : '';
  const number = Number.parseFloat(`${head}.${scaledTail}`);
  if (Number.isNaN(number)) {
    return '';
  }
  const formatted = formatNumber(number, maxDigits, false);
  if (parsed.includes(decimalSeparator)) {
    const [formattedHead] = formatted.split(decimalSeparator);
    // skip zero at digits position for non fixed floats
    // as at digits 2 for non fixed floats numbers like 1.50 has no sense, just 1.5 allowed
    // but 1.0 has sense as otherwise you will not be able to enter 1.05 for example
    const formattedTail =
      scaledTail !== '' && scaledTail[maxDigits - 1] === '0'
        ? scaledTail.slice(0, -1)
        : scaledTail;
    return `${formattedHead}${decimalSeparator}${formattedTail}`;
  }
  return formatted;
};

const navigationRef = createNavigationContainerRef();

export default {
  getCurrency(str, include_symbol = false, usd = false) {
    if (include_symbol === true) {
      if (usd === true) {
        return formatCurrency(str, true);
      }
      return formatCurrency(str);
    }
    return formatRateCurrency(str);
  },
  formatIntegerNumber(num) {
    return formatNumber(num, 0, false);
  },
  getNumber: AmbitoDolar.getNumber,
  formatFloatingPointNumber,
  getChangeColor(num, theme) {
    if (num === 0) {
      return Settings.getBlueColor(theme);
    } else if (num > 0) {
      return Settings.getGreenColor(theme);
    }
    return Settings.getRedColor(theme);
  },
  delay(ms = 2 * 1000) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  },
  timeout(p, ms = AmbitoDolar.FETCH_TIMEOUT) {
    return Promise.race([
      p,
      new Promise((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Promise execution timed out.'));
        }, ms);
      }),
    ]);
  },
  getJson,
  registerDevice: (data = {}) =>
    getJson(Settings.API_URL + '/register-device', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getRates: () =>
    new Promise((resolve) => {
      if (Settings.RATES_URI) {
        return resolve(getJson(Settings.RATES_URI));
      }
      debug('Using local rates file');
      return resolve(rates);
    }),
  getHistoricalRates: () =>
    new Promise((resolve, reject) => {
      if (Settings.HISTORICAL_RATES_URI) {
        return resolve(getJson(Settings.HISTORICAL_RATES_URI));
        // return resolve(getJson('https://httpstat.us/200?sleep=30000'));
      }
      return reject(new Error('No historical rates available'));
    }),
  getStats: (earlier) => {
    let url = Settings.API_URL + '/stats';
    // TODO: add parameters to url like getSocialScreenshotUrl ???
    if (earlier) {
      url += `?earlier=${earlier}`;
    }
    return getJson(url);
  },
  cleanVersion(version) {
    return semverValid(semverCoerce(version));
  },
  isMajorVersion(versionA, versionB) {
    versionA = this.cleanVersion(versionA);
    versionB = this.cleanVersion(versionB);
    return semverDiff(versionA, versionB) === 'major';
  },
  isVersionGt(versionA, versionB) {
    versionA = this.cleanVersion(versionA);
    versionB = this.cleanVersion(versionB);
    return semverGt(versionA, versionB);
  },
  getNotificationSettings,
  getNotificationSettingsSelector,
  getSortedRates(rates, order, orderDirection, excludedRates, rateTypes) {
    // defaults
    order ?? (order = 'default');
    orderDirection ?? (orderDirection = 'asc');
    rateTypes ?? (rateTypes = Object.keys(rates));
    // Unexpected token: operator (?) on expo with hermes
    // order ??= 'default';
    // orderDirection ??= 'asc';
    /* console.log(
      '>>> getSortedRates',
      order,
      orderDirection,
      excludedRates,
      rateTypes
    ); */
    let chain = _.chain(rates).omit(excludedRates).toPairs();
    if (order === 'default' && orderDirection === 'desc') {
      chain = chain
        // .orderBy(1, 'desc')
        .reverse();
    } else if (order === 'name') {
      chain = chain.orderBy(([type]) => {
        const title = AmbitoDolar.getRateTitle(type);
        return title;
      }, orderDirection);
    } else if (order === 'price') {
      chain = chain.orderBy(([, { stats }]) => {
        const stat = _.last(stats);
        const value = AmbitoDolar.getRateValue(stat);
        return value;
      }, orderDirection);
    } else if (order === 'change') {
      chain = chain.orderBy(([, { stats }]) => {
        const stat = _.last(stats);
        const change = stat[2];
        return change;
      }, orderDirection);
    } else if (order === 'update') {
      chain = chain.orderBy(([, { stats }]) => {
        const stat = _.last(stats);
        const timestamp = stat[0];
        return timestamp;
      }, orderDirection);
    } else if (order === 'custom') {
      chain = chain.orderBy(([type]) => {
        // when not rateTypes leave to last (usually when a new rate is added)
        const index =
          rateTypes.indexOf(type) > -1
            ? rateTypes.indexOf(type)
            : rateTypes.length;
        return index;
      }, orderDirection);
    }
    return chain.fromPairs().value();
  },
  getAvailableRates(rates) {
    if (rates) {
      return _.chain(rates)
        .omit([
          // rates to exclude
        ])
        .thru((rates) => AmbitoDolar.getAvailableRates(rates))
        .pickBy(({ stats }) => stats?.length > 1)
        .mapValues(({ stats, ...rate }) => ({
          ...rate,
          stats: _.takeRight(stats, Settings.MAX_NUMBER_OF_STATS),
        }))
        .value();
    }
  },
  useRates(customized = false) {
    const {
      rates,
      rate_order: order,
      rate_order_direction: orderDirection,
      excluded_rates: excludedRates,
      rate_types: rateTypes,
    } = useSelector(
      ({
        rates: { rates },
        application: {
          rate_order,
          rate_order_direction,
          excluded_rates,
          rate_types,
        },
      }) => ({
        rates,
        rate_order,
        rate_order_direction,
        excluded_rates,
        rate_types,
      }),
      shallowEqual,
    );
    return React.useMemo(() => {
      const availableRates = this.getAvailableRates(rates);
      if (customized === true) {
        return this.getSortedRates(
          availableRates,
          order,
          orderDirection,
          excludedRates,
          rateTypes,
        );
      }
      return availableRates;
    }, [customized, rates, order, orderDirection, excludedRates, rateTypes]);
  },
  isValid: (obj) => !_.isEmpty(obj),
  usePrevious(value) {
    const ref = React.useRef();
    React.useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  },
  getChartTicks() {
    return 4;
  },
  // https://stackoverflow.com/a/51497981/460939
  getTickValues(min, max, numValues) {
    const stepValue = (max - min) / (numValues - 1);
    const ticks = d3Array.range(min, max, stepValue).concat(max);
    return ticks;
  },
  getInlineRateValue(value, change) {
    let value_str;
    if (Array.isArray(value)) {
      value_str = `${this.getCurrency(value[0])}–${this.getCurrency(value[1])}`;
    } else {
      value_str = this.getCurrency(value);
    }
    if (change !== undefined) {
      value_str += `${Settings.SPACE_SEPARATOR}(${formatRateChange(change)})`;
    }
    return value_str;
  },
  roundToNearestEven(num) {
    return Math.round(num / 2) * 2;
  },
  roundToNearestEvenWithDecimals(num) {
    const scaledNum = Math.round(num * 100);
    const evenNum = Math.round(scaledNum / 2) * 2;
    return evenNum / 100;
  },
  roundDownToNearestEven(num) {
    const evenNum = Math.floor(num / 2) * 2;
    return evenNum;
  },
  getAvailableAppearances() {
    const appearances = ['system', 'light', 'dark'];
    const version = parseInt(Platform.Version, 10);
    // remove system option when unavailable
    if (
      (Platform.OS === 'ios' && version < 13) ||
      (Platform.OS === 'android' && version < 29)
    ) {
      appearances.shift();
    }
    return appearances;
  },
  getAppearanceString(colorScheme) {
    const availableAppearances = this.getAvailableAppearances();
    return I18n.t((colorScheme ?? availableAppearances[0]) + '_appearance');
  },
  getRateOrderString(order) {
    return I18n.t((order ?? 'default') + '_rate_order');
  },
  getInvertedTheme(theme) {
    return theme === 'light' ? 'dark' : 'light';
  },
  getScreenTitle(title) {
    // return title?.toUpperCase();
    return title;
  },
  // https://paco.im/blog/shared-hook-state-with-swr
  useSharedState: (key, initial) => {
    const { data: state, mutate: setState } = useSWR(key, {
      fallbackData: initial,
    });
    return [state, setState];
  },
  useTheme(forcedColorScheme) {
    const context = React.useContext(ThemeContext);
    const colorScheme = React.useMemo(
      () => forcedColorScheme ?? context?.colorScheme ?? 'light',
      [forcedColorScheme, context],
    );
    const theme = React.useMemo(
      () => ({
        theme: colorScheme,
        fonts: {
          // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L72
          footnote: Settings.getFontObject(colorScheme, 'footnote'), // 13 (18)
          // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L65
          subhead: Settings.getFontObject(colorScheme, 'subhead'), // 15 (20)
          // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L58
          callout: Settings.getFontObject(colorScheme, 'callout'), // 16 (21)
          // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L51
          body: Settings.getFontObject(colorScheme, 'body'), // 17 (22)
          // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L37
          title: Settings.getFontObject(colorScheme, 'title3'), // 20 (25)
          // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L23
          largeTitle: Settings.getFontObject(colorScheme, 'title1'), // 28 (34)
          // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L16
          extraLargeTitle: Settings.getFontObject(colorScheme, 'largeTitle'), // 34 (41)
        },
        invertedTheme: this.getInvertedTheme(colorScheme),
        // TODO: add fonts with theme here ??
        // getFontObject: (name) => Settings.getFontObject(theme, name),
      }),
      [colorScheme],
    );
    return theme;
  },
  useInterval: (callback, { leading = true, delay = 60 * 1000 } = {}) => {
    const handler = React.useCallback(
      (...args) => callback?.(...args),
      [callback],
    );
    React.useEffect(() => {
      if (leading === true) {
        handler(Date.now());
      }
      if (delay !== null) {
        const intervalId = setInterval(() => {
          handler(Date.now());
        }, delay);
        return () => clearInterval(intervalId);
      }
    }, [handler, leading, delay]);
  },
  useApplicationConstants() {
    const [constantsLoaded, setConstantsLoaded] = React.useState(false);
    const [, setContactAvailable] = this.useSharedState('contactAvailable');
    const [, setStoreAvailable] = this.useSharedState('storeAvailable');
    const [, setInstallationTime] = this.useSharedState('installationTime');
    const [, setSharingAvailable] = this.useSharedState('sharingAvailable');
    React.useEffect(() => {
      Promise.all([
        MailComposer.isAvailableAsync(),
        Linking.canOpenURL(Settings.APP_STORE_URI),
        Application.getInstallationTimeAsync(),
        Sharing.isAvailableAsync(),
      ]).then((data) => {
        debug('Application constants', data);
        const [
          contactAvailable,
          storeAvailable,
          installationTime,
          sharingAvailable,
        ] = data;
        setContactAvailable(contactAvailable);
        setStoreAvailable(storeAvailable);
        setInstallationTime(installationTime);
        setSharingAvailable(sharingAvailable);
        // done
        setConstantsLoaded(true);
      });
    }, []);
    return constantsLoaded;
  },
  useIndicatorStyle() {
    const { theme } = this.useTheme();
    return theme === 'light' ? 'black' : 'white';
  },
  useHeaderHeight: (modal = false) => {
    const headerHeight = useHeaderHeight();
    if (Platform.OS === 'ios') {
      if (modal === true) {
        // https://github.com/react-navigation/react-navigation/blob/6.x/packages/elements/src/Header/getDefaultHeaderHeight.tsx#L26
        return 56;
      }
      const offset = 1 / PixelRatio.get();
      // https://github.com/react-navigation/react-navigation/issues/11655#issuecomment-1781782125
      // https://github.com/react-navigation/react-navigation/commit/4c521b5c865f2c46d58abb2e9e7fd1b0d2074215
      if (headerHeight === 98) {
        // iPhone 15 / iPhone 15 Pro / iPhone 15 Pro Max / iPhone 16
        return headerHeight - offset;
      } else if (headerHeight === 100) {
        // iPhone 16 Pro
        return headerHeight - (1 + offset);
      } else if (headerHeight === 101) {
        // iPhone 16 Pro Max
        return headerHeight - (1 / 2 + offset);
      }
    }
    return headerHeight;
  },
  removeProtocol: (url) => url.replace(/^https?:\/\//, ''),
  // https://ethercreative.github.io/react-native-shadow-generator/
  getShadowDefaults: () => ({
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
  }),
  getNavigationContainerRef: () => navigationRef,
  getRgbaColor: (color) => {
    const rgbaArray = rgba(color);
    if (rgbaArray.length > 0) {
      return `rgba(${rgbaArray.toString()})`;
    }
  },
  debug,
};
