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

const BASE_TIMEZONE = 'America/Argentina/Buenos_Aires';
const OFFICIAL_TYPE = 'oficial';
const INFORMAL_TYPE = 'informal';
const TOURIST_TYPE = 'turista';
const CCL_TYPE = 'ccl';
const CCL_LEGACY_TYPE = 'cl';
const MEP_TYPE = 'mep';
const FUTURE_TYPE = 'futuro';
const WHOLESALER_TYPE = 'mayorista';
const CURRENCY_NUMBER_FORMAT = '0,0.00';
const BYTES_NUMBER_FORMAT = '0 b';
const NOTIFICATION_OPEN_TYPE = 'open';
const NOTIFICATION_CLOSE_TYPE = 'close';
const NOTIFICATION_VARIATION_TYPE = 'variation';

// https://stackoverflow.com/questions/28593304/same-date-in-different-time-zone/28615654#28615654
const getTimezoneDate = (date, format, keep_local_time, start_of_day) => {
  date = moment(date, format).tz(BASE_TIMEZONE, keep_local_time === true);
  if (start_of_day === true) {
    date = date
      // .subtract(1, 'days')
      .startOf('day');
  }
  return date;
};

const formatRateChange = (num) =>
  /* formatNumber(num, {
    style: 'percent',
  }); */
  (num > 0 ? '+' : '') + numeral(num).format(`${CURRENCY_NUMBER_FORMAT}`) + '%';

const formatRateCurrency = (num) =>
  // formatNumber(num);
  numeral(num).format(CURRENCY_NUMBER_FORMAT);

const formatCurrency = (num, usd) =>
  /* formatNumber(num, {
    style: 'currency',
    currency: usd === true ? 'USD' : 'ARS',
    currencyDisplay: 'symbol',
  }); */
  (usd === true ? 'US$' : '$') +
  numeral(num).format(`${CURRENCY_NUMBER_FORMAT}`);

const formatBytes = (num) => numeral(num).format(`$${BYTES_NUMBER_FORMAT}`);

const getBytes = (obj) => formatBytes(bytes(JSON.stringify(obj)));

const getNumberValue = (str, decimal_places = 2) =>
  +numeral(str).value().toFixed(decimal_places);

const getPercentNumberValue = (str) => getNumberValue(str.replace('%', ''));

const isRateFromToday = (rate) => {
  const today = getTimezoneDate()
    // .subtract(1, 'days')
    .startOf('day');
  // use processing time instead of original timestamp
  const rate_date = getTimezoneDate(rate[0])
    // .subtract(1, 'days')
    .startOf('day');
  return today.isSame(rate_date);
};

const hasRatesFromToday = (rates = {}) =>
  !isEmpty(pickBy(rates, (rate) => isRateFromToday(rate)));

const parseNaturalDate = (value, format /* = 'YYYY-MM-DDTHH:mm:ss' */) => {
  const date = chrono.es.parseDate(value);
  // use today when invalid chrono format (ignore timezone)
  return getTimezoneDate(date, undefined, true).format(format);
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
  getTimezoneDate,
  formatRateChange,
  formatRateCurrency,
  formatCurrency,
  getBytes,
  getNumberValue,
  getPercentNumberValue,
  isRateFromToday,
  hasRatesFromToday,
  parseNaturalDate,
  getAvailableRateTypes,
  getRateTitle,
  getNotificationTitle,
  getNotificationSettings,
};
