import AmbitoDolar from '@ambito-dolar/core';
import * as d3Array from 'd3-array';
import Constants from 'expo-constants';
import * as Localization from 'expo-localization';
import _ from 'lodash';
import React from 'react';
import { Platform, Appearance } from 'react-native';
import { persistStore } from 'redux-persist';
import { createSelector } from 'reselect';
import semverCoerce from 'semver/functions/coerce';
import semverDiff from 'semver/functions/diff';
import semverGt from 'semver/functions/gt';
import semverValid from 'semver/functions/valid';
import { ThemeContext } from 'styled-components';
import useSWR from 'swr';

import Settings from '../config/settings';

const getNotificationSettings = (notification_settings, value, type) => {
  notification_settings = AmbitoDolar.getNotificationSettings(
    notification_settings
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
  (notification_settings) => getNotificationSettings(notification_settings)
);

const fetchRetry = require('@zeit/fetch-retry')(fetch);

const fetchTimeout = async (url, opts = {}, ms = Settings.FETCH_TIMEOUT) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, ms);
  return fetch(url, {
    ...opts,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeout);
  });
};

const getJson = async (url, opts = {}) => {
  if (__DEV__) {
    console.log('Get json', url, opts);
  }
  const retry = opts.retry;
  const timeout = opts.timeout;
  return (retry === true ? fetchRetry : timeout ? fetchTimeout : fetch)(
    url,
    {
      ...opts,
      headers: {
        // Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
    timeout
  ).then((response) => {
    if (!response.ok) {
      // throw new Error(`${response.status}: ${response.statusText}`);
      throw new Error(response.statusText || response.status);
    }
    return response.json();
  });
  /* .then((data) => {
      return data;
    }) */
};

// default delimiters are used for the web because the way to get them is not consistent
if (Platform.OS !== 'web') {
  AmbitoDolar.setDelimiters({
    thousands: Localization.digitGroupingSeparator,
    decimal: Localization.decimalSeparator,
  });
}

const { decimal: DECIMAL_SEPARATOR } = AmbitoDolar.getDelimiters();

const FRACTION_DIGITS = AmbitoDolar.FRACTION_DIGITS;

const formatNumber = (
  num,
  maxDigits = FRACTION_DIGITS,
  forceFractionDigits = true
) => AmbitoDolar.formatNumber(num, maxDigits, forceFractionDigits);

const getNumber = (value, maxDigits = FRACTION_DIGITS) =>
  AmbitoDolar.getNumber(value, maxDigits);

const formatRateCurrency = (num) => AmbitoDolar.formatRateCurrency(num);

const formatRateChange = (num) => AmbitoDolar.formatRateChange(num);

const formatCurrency = (num, usd) => AmbitoDolar.formatCurrency(num, usd);

// https://github.com/realadvisor/rifm/blob/master/pages/number-format/index.js#L39

const numberAccept = new RegExp(`[\\d${DECIMAL_SEPARATOR}]+`, 'g');

const parseNumber = (string) => (string.match(numberAccept) || []).join('');

const formatFloatingPointNumber = (value, maxDigits = FRACTION_DIGITS) => {
  if (typeof value === 'number') {
    return formatNumber(value, maxDigits, false);
  }
  const parsed = parseNumber(value);
  let [head, tail] = parsed.split(DECIMAL_SEPARATOR);
  // add 0 on head when value starts with DECIMAL_SEPARATOR
  if (parsed.indexOf(DECIMAL_SEPARATOR) === 0) {
    head = 0;
  }
  // Avoid rounding errors at toLocaleString as when user enters 1.239 and maxDigits=2 we
  // must not to convert it to 1.24, it must stay 1.23
  const scaledTail = tail != null ? tail.slice(0, maxDigits) : '';
  const number = Number.parseFloat(`${head}.${scaledTail}`);
  if (Number.isNaN(number)) {
    return '';
  }
  const formatted = formatNumber(number, maxDigits, false);
  if (parsed.includes(DECIMAL_SEPARATOR)) {
    const [formattedHead] = formatted.split(DECIMAL_SEPARATOR);
    // skip zero at digits position for non fixed floats
    // as at digits 2 for non fixed floats numbers like 1.50 has no sense, just 1.5 allowed
    // but 1.0 has sense as otherwise you will not be able to enter 1.05 for example
    const formattedTail =
      scaledTail !== '' && scaledTail[maxDigits - 1] === '0'
        ? scaledTail.slice(0, -1)
        : scaledTail;
    return `${formattedHead}${DECIMAL_SEPARATOR}${formattedTail}`;
  }
  return formatted;
};

export default {
  getCurrency(str, include_symbol = true, usd = false) {
    if (include_symbol === true) {
      if (usd === true) {
        return formatCurrency(str, true);
      }
      return formatCurrency(str);
    }
    return formatRateCurrency(str);
  },
  getNumber,
  formatFloatingPointNumber,
  getChange(num) {
    const sign = num === 0 ? '=' : num > 0 ? '???' : '???';
    return formatRateChange(num) + Settings.SPACE_SEPARATOR + sign;
  },
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
  // https://github.com/whatwg/fetch/issues/20#issuecomment-196113354
  timeout(ms, p) {
    return Promise.race([
      p,
      new Promise((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Promise execution timed out.'));
        }, ms);
      }),
    ]);
  },
  async registerDevice(data) {
    return getJson(Settings.REGISTER_DEVICE_URI, {
      method: 'POST',
      body: JSON.stringify(data),
      retry: true,
    });
  },
  async getRates() {
    return getJson(Settings.RATES_URI, { retry: true });
  },
  async getHistoricalRates() {
    return getJson(Settings.HISTORICAL_RATES_URI, {
      timeout: Settings.FETCH_TIMEOUT,
    });
  },
  getPlatformModel() {
    if (Platform.OS === 'ios') {
      return {
        platform_model_identifier: Constants.platform.ios.platform,
        platform_model_name: Constants.platform.ios.model,
      };
    }
    return {
      // pass
    };
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
  isDev() {
    const {
      manifest: { releaseChannel },
    } = Constants;
    return (
      releaseChannel === undefined || releaseChannel.indexOf('staging') !== -1
    );
  },
  hasRates(rates) {
    const values = Object.values(rates || {});
    const rate_types = AmbitoDolar.getAvailableRateTypes();
    if (values.length === rate_types.length) {
      return (
        values
          // check one stat at least
          .map(({ stats }) => stats?.length > 1)
          .every((value) => value === true)
      );
    }
    return false;
  },
  usePrevious(value) {
    const ref = React.useRef();
    React.useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  },
  getRateValue(datum) {
    return _.max([].concat(datum[1]));
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
      value_str = `${this.getCurrency(value[0])}${Settings.SPACE_SEPARATOR}${
        Settings.BULLET_SEPARATOR
      }${Settings.SPACE_SEPARATOR}${this.getCurrency(value[1])}`;
    } else {
      value_str = this.getCurrency(value);
    }
    if (change !== undefined) {
      value_str += `${Settings.SPACE_SEPARATOR}(${formatRateChange(change)})`;
    }
    return value_str;
  },
  // https://github.com/brentvatne/hour-power/blob/master/app/hooks/usePersistedData.ts
  usePersistedData(store) {
    const [dataLoaded, setDataLoaded] = React.useState(false);
    React.useEffect(() => {
      async function initializeAsync() {
        try {
          // https://github.com/rt2zz/redux-persist/blob/master/docs/recipes.md
          persistStore(
            store,
            {
              // pass
            },
            () => {
              if (__DEV__) {
                console.log('State restored');
              }
              setDataLoaded(true);
            }
          );
          // ).purge();
        } catch (error) {
          console.error('Unable to restore application state', error);
        }
      }
      initializeAsync();
    }, []);
    return [dataLoaded];
  },
  // https://paco.im/blog/shared-hook-state-with-swr
  useSharedState: (key, initial) => {
    const { data: state, mutate: setState } = useSWR(key, {
      initialData: initial,
    });
    return [state, setState];
  },
  // https://github.com/facebook/react-native/issues/28525#issuecomment-666244448
  // https://github.com/expo/expo/issues/10815#issuecomment-719083889
  useColorScheme() {
    const [colorScheme, setColorScheme] = React.useState(
      Appearance.getColorScheme()
    );
    const onColorSchemeChange = React.useCallback(
      _.throttle(
        ({ colorScheme }) => {
          setColorScheme(colorScheme);
        },
        Settings.ANIMATION_DURATION * 2,
        {
          leading: false,
        }
      ),
      []
    );
    React.useEffect(() => {
      Appearance.addChangeListener(onColorSchemeChange);
      return () => {
        onColorSchemeChange.cancel();
        Appearance.removeChangeListener(onColorSchemeChange);
      };
    }, []);
    return colorScheme;
  },
  useTheme() {
    const context = React.useContext(ThemeContext);
    const colorScheme = React.useMemo(
      () => context?.colorScheme || 'light',
      [context]
    );
    const theme = React.useMemo(
      () => ({
        theme: colorScheme,
        fonts: {
          footnote: Settings.getFontObject(colorScheme, 'footnote'), // 13
          subhead: Settings.getFontObject(colorScheme, 'subhead'), // 15
          // callout: Settings.getFontObject(theme, 'callout'), // 16
          body: Settings.getFontObject(colorScheme, 'body'), // 17
          title: Settings.getFontObject(colorScheme, 'title3'), // 20
          largeTitle: Settings.getFontObject(colorScheme, 'title1'), // 28
        },
        // TODO: add fonts with theme here ??
        // getFontObject: (name) => Settings.getFontObject(theme, name),
      }),
      [colorScheme]
    );
    return theme;
  },
};
