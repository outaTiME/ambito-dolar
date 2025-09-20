import JsonURL from '@jsonurl/jsonurl';
import ky from 'ky';
import * as _ from 'lodash';
import moment from 'moment-timezone';
import numeral from 'numeral';

// locales

import 'moment/locale/es.js';
import 'numeral/locales/es.js';

// defaults

const chosenLocale = 'es';
moment.locale(chosenLocale);
numeral.locale(chosenLocale);

// constants

const TIMEZONE = 'America/Argentina/Buenos_Aires';

const OFFICIAL_TYPE = 'oficial';
const INFORMAL_TYPE = 'informal';
const TOURIST_TYPE = 'turista';
const SAVING_TYPE = 'ahorro';
const CCL_TYPE = 'ccl';
const CCL_LEGACY_TYPE = 'cl';
const MEP_TYPE = 'mep';
const CCB_TYPE = 'ccb';
const WHOLESALE_TYPE = 'mayorista';
const QATAR_TYPE = 'qatar';
const LUXURY_TYPE = 'lujo';
const CULTURAL_TYPE = 'cultural';
const BNA_TYPE = 'bna';
const EURO_TYPE = 'euro';
const EURO_INFORMAL_TYPE = 'euro_informal';
const REAL_TYPE = 'real';
const FUTURES_TYPE = 'futuros';

const NOTIFICATION_OPEN_TYPE = 'open';
const NOTIFICATION_CLOSE_TYPE = 'close';
const NOTIFICATION_VARIATION_TYPE = 'variation';

// Square: 1080 x 1080 pixels, 1:1 aspect ratio
// Portrait: 1080 x 1350 pixels, 4:5 aspect ratio
// Portrait IGTV: 1080 x 1920 pixels, 9:16 aspect ratio

const VIEWPORT_PORTRAIT_WIDTH = 648;
// const VIEWPORT_PORTRAIT_WIDTH = 684;
const SOCIAL_IMAGE_WIDTH = 1080;
// 810 (648)
// 855
const VIEWPORT_PORTRAIT_HEIGHT = (VIEWPORT_PORTRAIT_WIDTH / 4) * 5;
const SOCIAL_IMAGE_HEIGHT = (SOCIAL_IMAGE_WIDTH / 4) * 5;
// 1152 (648)
// 1216
const VIEWPORT_PORTRAIT_STORY_HEIGHT = (VIEWPORT_PORTRAIT_WIDTH / 9) * 16;
const SOCIAL_STORY_IMAGE_HEIGHT = (SOCIAL_IMAGE_WIDTH / 9) * 16;

const FETCH_TIMEOUT = 30 * 1000; // 30 secs

const getCapitalized = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// https://github.com/moment/moment/pull/4129#issuecomment-339201996
const __weekdays = moment.weekdays().map((days) => getCapitalized(days));
const __weekdaysShort = moment
  .weekdaysShort()
  .map((days) => getCapitalized(days));
moment.updateLocale(chosenLocale, {
  weekdays: __weekdays,
  weekdaysShort: __weekdaysShort,
});

const getDate = (date, format, start_of_day) => {
  date = moment(date, format);
  if (start_of_day === true) {
    date = date.startOf('day');
  }
  return date;
};

const getTimezoneDate = (date, format, start_of_day) => {
  date = getDate(date, format).tz(TIMEZONE);
  // start_of_day must be applied after the timezone conversion
  if (start_of_day === true) {
    date = date.startOf('day');
  }
  return date;
};

const FRACTION_DIGITS = 2;

// api uses the chosen locale and the client its own locale (except on web)

const setDelimiters = ({ thousands, decimal }) => {
  const localeData = numeral.localeData();
  Object.assign(localeData.delimiters, {
    ...(thousands && { thousands }),
    ...(decimal && { decimal }),
  });
};

const getDelimiters = () => {
  const localeData = numeral.localeData();
  return localeData.delimiters;
};

const toFixedNoRounding = (num, n) => {
  const reg = new RegExp('^-?\\d+(?:\\.\\d{0,' + n + '})?', 'g');
  const a = num.toString().match(reg)[0];
  const dot = a.indexOf('.');
  if (dot === -1) {
    // integer, insert decimal dot and pad up zeros
    return a + '.' + '0'.repeat(n);
  }
  const b = n - (a.length - dot) + 1;
  return b > 0 ? a + '0'.repeat(b) : a;
};

const getNumber = (value, maxDigits = FRACTION_DIGITS) => {
  value = numeral(value).value();
  if (typeof value === 'number' && !isNaN(value)) {
    // return +value.toFixed(maxDigits);
    // truncate to max digits
    return +toFixedNoRounding(value, maxDigits);
  }
  return value;
};

const formatNumber = (
  num,
  maxDigits = FRACTION_DIGITS,
  forceFractionDigits = true,
) => {
  // truncate to prevent rounding issues
  num = getNumber(num, maxDigits);
  if (typeof num === 'number' && !isNaN(num)) {
    const decimal_digits = '0'.repeat(maxDigits);
    const fmt = forceFractionDigits
      ? '0,0.' + decimal_digits
      : '0,0[.][' + decimal_digits + ']';

    return numeral(num).format(fmt);
  }
  return num;
};

/* const localeData = numeral.localeData();
Object.assign(localeData.abbreviations, {
  million: 'm',
});

const formatNumberHumanized = (num, maxDigits = FRACTION_DIGITS) => {
  const decimal_digits = '0'.repeat(maxDigits);
  const fmt = '0.' + decimal_digits + 'a';
  return numeral(num).format(fmt);
}; */

const formatNumberHumanized = (num, maxDigits = FRACTION_DIGITS) => {
  return Intl.NumberFormat(chosenLocale, {
    notation: 'compact',
    // minimumFractionDigits: 2,
    // maximumFractionDigits: maxDigits,
    compactDisplay: 'long',
  }).format(num);
};

const formatRateCurrency = (num, compact = false) =>
  formatNumber(num, FRACTION_DIGITS, !compact);

const formatRateChange = (num, percentage = true, compact = false) => {
  const formatted = formatRateCurrency(num, compact);
  if (formatted) {
    if (compact && num === 0) {
      return '';
    }
    return (num > 0 ? '+' : '') + formatted + (percentage === true ? '%' : '');
  }
  return formatted;
};

const formatCurrency = (num, usd, type = null) => {
  const formatted = formatRateCurrency(num);
  if (!formatted) {
    return formatted;
  }
  if (usd !== true) {
    return '$' + formatted;
  }
  if (type === EURO_TYPE || type === EURO_INFORMAL_TYPE) {
    return '€' + formatted;
  }
  if (type === REAL_TYPE) {
    return 'R$' + formatted;
  }
  return 'US$' + formatted;
};

const isRateFromToday = (rate) => {
  const date = getTimezoneDate(undefined, undefined, true);
  const rate_date = getTimezoneDate(rate[0], undefined, true);
  // use processing time instead of original timestamp
  return date.isSame(rate_date);
};

const hasRatesFromToday = (rates = {}) =>
  !_.isEmpty(_.pickBy(rates, (rate) => isRateFromToday(rate)));

const getAvailableRateTypes = () => [
  OFFICIAL_TYPE,
  BNA_TYPE,
  INFORMAL_TYPE,
  TOURIST_TYPE,
  // QATAR_TYPE,
  // SAVING_TYPE,
  // LUXURY_TYPE,
  // CULTURAL_TYPE,
  CCL_TYPE,
  MEP_TYPE,
  CCB_TYPE,
  WHOLESALE_TYPE,
  EURO_TYPE,
  EURO_INFORMAL_TYPE,
  REAL_TYPE,
  // FUTURES_TYPE,
];

const getAvailableRates = (rates, check = false) => {
  // respect the order from getAvailableRateTypes
  const available_rate_types = getAvailableRateTypes();
  // leave only the available rates sorted
  rates = _.pick(rates, available_rate_types);
  /* if (
    check === false ||
    (check === true &&
      Object.keys(rates).length === available_rate_types.length)
  ) {
    return rates;
  } */
  return _.isEmpty(rates) ? false : rates;
};

const getRateTitle = (type) => {
  if (type === OFFICIAL_TYPE) {
    return 'Oficial';
  } else if (type === BNA_TYPE) {
    return 'BNA';
  } else if (type === INFORMAL_TYPE) {
    return 'Blue';
  } else if (type === TOURIST_TYPE) {
    return 'Tarjeta';
  } else if (type === QATAR_TYPE) {
    return 'Qatar';
  } else if (type === SAVING_TYPE) {
    return 'Ahorro';
  } else if (type === LUXURY_TYPE) {
    return 'Lujo';
  } else if (type === CULTURAL_TYPE) {
    return 'Cultural';
  } else if (type === CCL_TYPE) {
    // return 'Contado con liquidación',
    return 'CCL';
  } else if (type === MEP_TYPE) {
    return 'MEP';
  } else if (type === CCB_TYPE) {
    return 'Cripto';
  } else if (type === WHOLESALE_TYPE) {
    return 'Mayorista';
  } else if (type === EURO_TYPE) {
    return 'Euro';
  } else if (type === EURO_INFORMAL_TYPE) {
    return 'Euro Blue';
  } else if (type === REAL_TYPE) {
    return 'Real';
  } else if (type === FUTURES_TYPE) {
    return 'Futuros';
  }
};

const getNotificationTitle = (type) => {
  if (type === NOTIFICATION_OPEN_TYPE) {
    return 'Apertura de jornada';
  } else if (type === NOTIFICATION_CLOSE_TYPE) {
    return 'Cierre de jornada';
  }
  return 'Variación de cotización';
};

const getNotificationSettings = (notification_settings) => {
  const rate_types = getAvailableRateTypes();
  // all rate types enabled by default
  const rate_defaults = rate_types.reduce((obj, type) => {
    obj[type] = true;
    return obj;
  }, {});
  const type_defaults = {
    enabled: false,
    rates: rate_defaults,
  };
  // use new instance to prevent update issues over the same type_defaults instance
  return _.merge(
    {},
    {
      enabled: true,
      [NOTIFICATION_OPEN_TYPE]: {
        ...type_defaults,
      },
      [NOTIFICATION_CLOSE_TYPE]: {
        ...type_defaults,
        enabled: true,
      },
      [NOTIFICATION_VARIATION_TYPE]: {
        ...type_defaults,
      },
    },
    notification_settings,
  );
};

const getRateValue = (stat) => Math.max(...[].concat(stat[1]));

const getRateChange = (stat, include_symbol = false) => {
  const str = [];
  let change = stat;
  if (typeof stat !== 'number') {
    // datum
    const prev_value = stat[3];
    if (prev_value) {
      const value = getRateValue(stat);
      const formatted_diff = formatRateChange(value - prev_value, false);
      if (formatted_diff) {
        str.push(formatted_diff);
      }
    }
    change = stat[2];
  }
  const formatted_change = formatRateChange(change);
  if (formatted_change) {
    const show_as_detail = str.length > 0;
    show_as_detail && str.push(' (');
    str.push(formatted_change);
    show_as_detail && str.push(')');
    const symbol = change === 0 ? '=' : change > 0 ? '↑' : '↓';
    include_symbol === true && str.push(` ${symbol}`);
  }
  return str.join('');
};

const fetchData = (url, opts = {}) =>
  ky(url, {
    // https://github.com/sindresorhus/ky?tab=readme-ov-file#timeout
    timeout: FETCH_TIMEOUT,
    ...opts,
  });

export default {
  TIMEZONE,
  OFFICIAL_TYPE,
  INFORMAL_TYPE,
  TOURIST_TYPE,
  SAVING_TYPE,
  CCL_TYPE,
  CCL_LEGACY_TYPE,
  MEP_TYPE,
  CCB_TYPE,
  WHOLESALE_TYPE,
  QATAR_TYPE,
  LUXURY_TYPE,
  CULTURAL_TYPE,
  BNA_TYPE,
  EURO_TYPE,
  EURO_INFORMAL_TYPE,
  REAL_TYPE,
  FUTURES_TYPE,
  NOTIFICATION_OPEN_TYPE,
  NOTIFICATION_CLOSE_TYPE,
  NOTIFICATION_VARIATION_TYPE,
  VIEWPORT_PORTRAIT_WIDTH,
  SOCIAL_IMAGE_WIDTH,
  VIEWPORT_PORTRAIT_HEIGHT,
  SOCIAL_IMAGE_HEIGHT,
  VIEWPORT_PORTRAIT_STORY_HEIGHT,
  SOCIAL_STORY_IMAGE_HEIGHT,
  FETCH_TIMEOUT,
  getCapitalized,
  getDate,
  getTimezoneDate,
  FRACTION_DIGITS,
  setDelimiters,
  getDelimiters,
  getNumber,
  formatNumber,
  formatNumberHumanized,
  formatRateCurrency,
  formatRateChange,
  formatCurrency,
  isRateFromToday,
  hasRatesFromToday,
  getAvailableRateTypes,
  getAvailableRates,
  getRateTitle,
  getNotificationTitle,
  getNotificationSettings,
  getRateValue,
  getRateChange,
  crushJson: (obj) => JsonURL.stringify(obj, { AQF: true }),
  uncrushJson: (str) => JsonURL.parse(str, { AQF: true }),
  fetch: fetchData,
};
