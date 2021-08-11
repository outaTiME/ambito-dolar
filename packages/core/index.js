const chrono = require('chrono-node');
const isEmpty = require('lodash.isempty');
const merge = require('lodash.merge');
const pickBy = require('lodash.pickby');
const moment = require('moment-timezone');
require('moment/locale/es');
const numeral = require('numeral');
require('numeral/locales');
const bytes = require('utf8-length');

// defaults

const chosenLocale = 'es';
moment.locale(chosenLocale);
numeral.locale(chosenLocale);

// constants

const TIMEZONE = 'America/Argentina/Buenos_Aires';
const OFFICIAL_TYPE = 'oficial';
const INFORMAL_TYPE = 'informal';
const TOURIST_TYPE = 'turista';
const CCL_TYPE = 'ccl';
const CCL_LEGACY_TYPE = 'cl';
const MEP_TYPE = 'mep';
const FUTURE_TYPE = 'futuro';
const WHOLESALER_TYPE = 'mayorista';
const NOTIFICATION_OPEN_TYPE = 'open';
const NOTIFICATION_CLOSE_TYPE = 'close';
const NOTIFICATION_VARIATION_TYPE = 'variation';

// must be proportional to 1080x1920 (IG feed and story)
const WEB_VIEWPORT_SIZE = 630;
const WEB_VIEWPORT_STORY_HEIGHT = 1120;

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

const formatNumber = (
  num,
  maxDigits = FRACTION_DIGITS,
  forceFractionDigits = true
) => {
  // https://github.com/NickKaramoff/pretty-money/issues/11
  /* const number_fmt = prettyMoney(
    {
      decimalDelimiter: DECIMAL_SEPARATOR,
      thousandsDelimiter: DIGIT_GROUPING_SEPARATOR,
      minDecimal: forceFractionDigits === true ? maxDigits : 0,
      maxDecimal: maxDigits,
    },
    num
  ); */
  const decimal_digits = '0'.repeat(maxDigits);
  let fmt = '0,0.' + decimal_digits;
  if (forceFractionDigits !== true) {
    fmt = '0,0[.][' + decimal_digits + ']';
  }
  return numeral(num).format(fmt);
};

// TODO: should return undefined when value is null?
const getNumber = (value, maxDigits = FRACTION_DIGITS) =>
  +numeral(value || 0)
    .value()
    .toFixed(maxDigits);

const formatRateCurrency = (num) => formatNumber(num);

const formatRateChange = (num) =>
  (num > 0 ? '+' : '') + formatRateCurrency(num) + '%';

const formatCurrency = (num, usd) =>
  (usd === true ? 'US$' : '$') + formatRateCurrency(num);

const formatBytes = (num) => numeral(num).format('0 b');

const getBytes = (obj) => formatBytes(bytes(JSON.stringify(obj)));

const getPercentNumber = (str) => getNumber((str || '').replace('%', ''));

const isRateFromToday = (rate) => {
  const date = getTimezoneDate(undefined, undefined, true);
  const rate_date = getTimezoneDate(rate[0], undefined, true);
  // use processing time instead of original timestamp
  return date.isSame(rate_date);
};

const hasRatesFromToday = (rates = {}) =>
  !isEmpty(pickBy(rates, (rate) => isRateFromToday(rate)));

const parseNaturalDate = (value, format /* = 'YYYY-MM-DDTHH:mm:ss' */) => {
  const date = chrono.es.parseDate(value);
  // use today when invalid chrono format (ignore timezone)
  return getTimezoneDate(date).format(format);
};

const getAvailableRateTypes = () => [
  OFFICIAL_TYPE,
  TOURIST_TYPE,
  INFORMAL_TYPE,
  CCL_TYPE,
  MEP_TYPE,
  // FUTURE_TYPE,
  WHOLESALER_TYPE,
];

const getRateTitle = (type) => {
  if (type === OFFICIAL_TYPE) {
    return 'Oficial';
  } else if (type === TOURIST_TYPE) {
    return 'Turista';
  } else if (type === INFORMAL_TYPE) {
    return 'Blue';
  } else if (type === CCL_TYPE) {
    // return 'Contado con liquidación',
    return 'CCL';
  } else if (type === MEP_TYPE) {
    return 'MEP';
  } else if (type === FUTURE_TYPE) {
    return 'Futuro';
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

module.exports = {
  TIMEZONE,
  OFFICIAL_TYPE,
  INFORMAL_TYPE,
  TOURIST_TYPE,
  CCL_TYPE,
  CCL_LEGACY_TYPE,
  MEP_TYPE,
  FUTURE_TYPE,
  WHOLESALER_TYPE,
  NOTIFICATION_OPEN_TYPE,
  NOTIFICATION_CLOSE_TYPE,
  NOTIFICATION_VARIATION_TYPE,
  WEB_VIEWPORT_SIZE,
  WEB_VIEWPORT_STORY_HEIGHT,
  getCapitalized,
  getDate,
  getTimezoneDate,
  FRACTION_DIGITS,
  setDelimiters,
  getDelimiters,
  formatNumber,
  getNumber,
  formatRateChange,
  formatRateCurrency,
  formatCurrency,
  getBytes,
  getPercentNumber,
  isRateFromToday,
  hasRatesFromToday,
  parseNaturalDate,
  getAvailableRateTypes,
  getRateTitle,
  getNotificationTitle,
  getNotificationSettings,
};
