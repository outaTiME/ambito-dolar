const isEmpty = require('lodash.isempty');
const max = require('lodash.max');
const merge = require('lodash.merge');
const pick = require('lodash.pick');
const pickBy = require('lodash.pickby');
const moment = require('moment-timezone');
require('moment/locale/es');
const numeral = require('numeral');
require('numeral/locales');

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
const WHOLESALER_TYPE = 'mayorista';
const QATAR_TYPE = 'qatar';
const LUXURY_TYPE = 'lujo';
const CULTURAL_TYPE = 'cultural';

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
  // keep local time only when dates
  const keep_time = !!date;
  // fixed-offset timezone with the provided offset
  date = moment.parseZone(date, format);
  date = getDate(date, format).tz(TIMEZONE, keep_time);
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

const toFixedNoRounding = function (num, n) {
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
  if (typeof value === 'number') {
    // return +value.toFixed(maxDigits);
    // truncate to max digits
    return +toFixedNoRounding(value, maxDigits);
  }
  return value;
};

const formatNumber = (
  num,
  maxDigits = FRACTION_DIGITS,
  forceFractionDigits = true
) => {
  // truncate to prevent rounding issues
  num = getNumber(num, maxDigits);
  if (typeof num === 'number') {
    const decimal_digits = '0'.repeat(maxDigits);
    let fmt = '0,0.' + decimal_digits;
    if (forceFractionDigits !== true) {
      fmt = '0,0[.][' + decimal_digits + ']';
    }
    return numeral(num).format(fmt);
  }
  return num;
};

const formatRateCurrency = (num) => formatNumber(num);

const formatRateChange = (num, percentage = true) => {
  const formatted = formatRateCurrency(num);
  if (formatted) {
    return (num > 0 ? '+' : '') + formatted + (percentage === true ? '%' : '');
  }
  return formatted;
};

const formatCurrency = (num, usd) => {
  const formatted = formatRateCurrency(num);
  if (formatted) {
    return (usd === true ? 'US$' : '$') + formatted;
  }
  return formatted;
};

const isRateFromToday = (rate) => {
  const date = getTimezoneDate(undefined, undefined, true);
  const rate_date = getTimezoneDate(rate[0], undefined, true);
  // use processing time instead of original timestamp
  return date.isSame(rate_date);
};

const hasRatesFromToday = (rates = {}) =>
  !isEmpty(pickBy(rates, (rate) => isRateFromToday(rate)));

const getAvailableRateTypes = () => [
  OFFICIAL_TYPE,
  INFORMAL_TYPE,
  TOURIST_TYPE,
  QATAR_TYPE,
  SAVING_TYPE,
  // LUXURY_TYPE,
  // CULTURAL_TYPE,
  CCL_TYPE,
  MEP_TYPE,
  CCB_TYPE,
  WHOLESALER_TYPE,
];

const getAvailableRates = (rates, check = false) => {
  // respect the order from getAvailableRateTypes
  const available_rate_types = getAvailableRateTypes();
  // leave only the available rates sorted
  rates = pick(rates, available_rate_types);
  /* if (
    check === false ||
    (check === true &&
      Object.keys(rates).length === available_rate_types.length)
  ) {
    return rates;
  } */
  return isEmpty(rates) ? false : rates;
};

const getRateTitle = (type) => {
  if (type === OFFICIAL_TYPE) {
    return 'Oficial';
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
  } else if (type === WHOLESALER_TYPE) {
    return 'Mayorista';
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
  return merge(
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
    notification_settings
  );
};

const getRateValue = (stat) => max([].concat(stat[1]));

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

module.exports = {
  TIMEZONE,
  OFFICIAL_TYPE,
  INFORMAL_TYPE,
  TOURIST_TYPE,
  SAVING_TYPE,
  CCL_TYPE,
  CCL_LEGACY_TYPE,
  MEP_TYPE,
  CCB_TYPE,
  WHOLESALER_TYPE,
  QATAR_TYPE,
  LUXURY_TYPE,
  CULTURAL_TYPE,
  NOTIFICATION_OPEN_TYPE,
  NOTIFICATION_CLOSE_TYPE,
  NOTIFICATION_VARIATION_TYPE,
  VIEWPORT_PORTRAIT_WIDTH,
  SOCIAL_IMAGE_WIDTH,
  VIEWPORT_PORTRAIT_HEIGHT,
  SOCIAL_IMAGE_HEIGHT,
  VIEWPORT_PORTRAIT_STORY_HEIGHT,
  SOCIAL_STORY_IMAGE_HEIGHT,
  getCapitalized,
  getDate,
  getTimezoneDate,
  FRACTION_DIGITS,
  setDelimiters,
  getDelimiters,
  getNumber,
  formatNumber,
  formatRateChange,
  formatRateCurrency,
  formatCurrency,
  isRateFromToday,
  hasRatesFromToday,
  getAvailableRates,
  getRateTitle,
  getNotificationTitle,
  getNotificationSettings,
  getRateValue,
  getRateChange,
};
