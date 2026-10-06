import ky from 'ky';
import _ from 'lodash';
import moment from 'moment-timezone';
import numeral from 'numeral';
import prettyMilliseconds from 'pretty-ms';
import pRetry from 'promise-retry';

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
const FUTURE_TYPE = 'futuro';
const INFLATION_TYPE = 'inflacion';
const INFLATION_ANNUAL_TYPE = 'inflacion_interanual';
const TERM_DEPOSIT_TYPE = 'plazo_fijo';
const UVA_TYPE = 'uva';
const COUNTRY_RISK_TYPE = 'riesgo_pais';
const MERVAL_TYPE = 'merval';
const RESERVES_TYPE = 'reservas';

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

const formatDuration = (ms) => (ms == null ? null : prettyMilliseconds(ms));

const isRateFromToday = (rate) => {
  const date = getTimezoneDate(undefined, undefined, true);
  const rate_date = getTimezoneDate(rate[0], undefined, true);
  // use processing time instead of original timestamp
  return date.isSame(rate_date);
};

// compares in market days, a midnight stamp shifts a day on a phone west of buenos aires
const getStatsInRange = (stats, from) => {
  if (!stats?.length) {
    return [];
  }
  const to = getTimezoneDate(_.last(stats)[0]);
  const start = from(to, getTimezoneDate(stats[0][0]));
  return stats.filter(([timestamp]) =>
    getTimezoneDate(timestamp).isBetween(start, to, 'day', '[]'),
  );
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
  FUTURE_TYPE,
];

// default display order
const getAvailableMarketTypes = () => [
  INFLATION_TYPE,
  INFLATION_ANNUAL_TYPE,
  TERM_DEPOSIT_TYPE,
  UVA_TYPE,
  COUNTRY_RISK_TYPE,
  MERVAL_TYPE,
  RESERVES_TYPE,
];

const getAvailableRates = (rates) => {
  // respect the order from getAvailableRateTypes
  const available_rate_types = getAvailableRateTypes();
  // leave only the available rates sorted
  rates = _.pick(rates, available_rate_types);
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
  } else if (type === FUTURE_TYPE) {
    return 'Futuro';
  }
};

const getMarketTitle = (type) => {
  if (type === INFLATION_TYPE) {
    return 'Inflación';
  } else if (type === INFLATION_ANNUAL_TYPE) {
    return 'Inflación interanual';
  } else if (type === TERM_DEPOSIT_TYPE) {
    return 'Plazo fijo';
  } else if (type === UVA_TYPE) {
    return 'UVA';
  } else if (type === COUNTRY_RISK_TYPE) {
    return 'Riesgo país';
  } else if (type === MERVAL_TYPE) {
    return 'Merval';
  } else if (type === RESERVES_TYPE) {
    return 'Reservas';
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

// the stat a fetched value turns into, the hash only rides along
// getThreshold gets the notified value and the new one
const getNextRateStat = (
  rate,
  { rate_last, date, rate_hash, getThreshold },
) => {
  // FIXME: use the average between the values instead of the highest one ???
  // eslint-disable-next-line no-sparse-arrays
  const rate_last_max = getRateValue([, rate_last]);
  // processing time unless the source dates its value
  const rate_date = date ?? getTimezoneDate().format();
  // get close rate when first rate of day (open)
  const rate_close = rate
    ? getTimezoneDate(rate_date).isSame(rate[0], 'day')
      ? rate[3]
      : getRateValue(rate)
    : rate_last_max;
  // calculate from open / close rate and truncate
  const rate_change_percent = rate_close
    ? getNumber((rate_last_max / rate_close - 1) * 100)
    : 0;
  // handles variations between notifications regardless of the exchange rate day
  const prev = rate?.[4] ?? rate_last_max;
  // truncate decimals
  const diff = getNumber(Math.abs(prev - rate_last_max));
  const threshold = getThreshold(prev, rate_last_max);
  const should_notify = diff !== 0 && diff > threshold;
  return {
    stat: [
      rate_date,
      rate_last,
      rate_change_percent,
      rate_close,
      should_notify ? rate_last_max : prev,
      rate_hash,
    ],
    variation: { prev, curr: rate_last_max, diff, threshold, should_notify },
  };
};

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

const fetcher = ky.create({
  // over the slowest call measured, a cold stats query, the rest sit under a second
  timeout: 15 * 1000,
});

const promiseRetry = (fn, opts) =>
  pRetry(fn, {
    retries: 5,
    minTimeout: 100,
    randomize: true,
    ...opts,
  });

// a same day stat is replaced, older ones keep their first three fields to reduce the file size
const addStat = (stats, stat, max) => {
  const day = getTimezoneDate(stat[0]);
  return _.takeRight(
    (stats || [])
      .filter((item) => !day.isSame(item[0], 'day'))
      .map((item) => _.take(item, 3))
      .concat([stat]),
    max,
  );
};

// the new stats replace every day from their first one on, without the open and the hash
const mergeHistoricalStats = (history, stats) => {
  const from = getTimezoneDate(_.first(stats)[0]);
  return (history || [])
    .filter(([timestamp]) => getTimezoneDate(timestamp).isBefore(from, 'day'))
    .concat(stats.map((stat) => _.take(stat, 3)));
};

const getChangeMessage = (rate) => {
  const value = getRateValue(rate);
  const formatted_value = formatRateCurrency(value, true);
  const change = rate[2];
  const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '';
  if (arrow) {
    const abs_pct = formatRateCurrency(Math.abs(change), true);
    return `${formatted_value} ${arrow}${abs_pct}%`;
  }
  return formatted_value;
};

const getRateMessage = (type, rate) => {
  const rate_title = getRateTitle(type);
  if (rate_title) {
    return `${rate_title.toUpperCase()} ${getChangeMessage(rate)}`;
  }
};

// a setting saved before the wholesale rate carries ccl as cl too
const isNotificationRateEnabled = (settings, type) =>
  type === CCL_TYPE
    ? settings.rates[CCL_LEGACY_TYPE] !== false &&
      settings.rates[CCL_TYPE] === true
    : settings.rates[type] === true;

// the push body and the social caption, reddit and bluesky cap the caption at 300 characters
const getBodyMessage = (rates) => {
  const available_rates = getAvailableRates(rates);
  if (available_rates) {
    const body = _.chain(available_rates)
      .map((rate, type) => ({ type, rate, mag: Math.abs(rate[2] ?? 0) }))
      .sortBy((x) => -x.mag)
      .map(({ type, rate }) => getRateMessage(type, rate))
      // remove empty messages
      .compact()
      .value();
    if (body.length > 0) {
      return body.join(', ');
    }
  }
};

const getSocialCaption = (type, rates) => {
  const body = getBodyMessage(rates);
  if (body) {
    const title = getNotificationTitle(type);
    return `${title}. ${body}`;
  }
};

// which pushes a run sends, a variation is a notified value that moved in getNextRateStat
const getNotifications = ({
  close_day,
  rates,
  new_rates,
  has_rates_from_today,
}) => {
  const all_rates = { ...rates, ...new_rates };
  if (close_day === true) {
    return { notifications: [[NOTIFICATION_CLOSE_TYPE, all_rates]] };
  }
  if (_.isEmpty(new_rates)) {
    return { notifications: [] };
  }
  if (!has_rates_from_today) {
    return { notifications: [[NOTIFICATION_OPEN_TYPE, all_rates]] };
  }
  const variations = Object.entries(new_rates).map(([type, rate]) => {
    const prev = rates[type]?.[4];
    const curr = rate[4];
    return { type, prev, curr, notify: prev !== curr };
  });
  const variation_rates = _.pick(
    new_rates,
    variations.filter(({ notify }) => notify).map(({ type }) => type),
  );
  return {
    // join variations in a single notification
    notifications: _.isEmpty(variation_rates)
      ? []
      : [[NOTIFICATION_VARIATION_TYPE, variation_rates]],
    variations,
  };
};

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
  FUTURE_TYPE,
  INFLATION_TYPE,
  INFLATION_ANNUAL_TYPE,
  TERM_DEPOSIT_TYPE,
  UVA_TYPE,
  COUNTRY_RISK_TYPE,
  MERVAL_TYPE,
  RESERVES_TYPE,
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
  formatNumberHumanized,
  formatRateCurrency,
  formatRateChange,
  formatCurrency,
  formatDuration,
  isRateFromToday,
  getStatsInRange,
  getNextRateStat,
  addStat,
  mergeHistoricalStats,
  getNotifications,
  isNotificationRateEnabled,
  getBodyMessage,
  getSocialCaption,
  hasRatesFromToday,
  getAvailableRateTypes,
  getAvailableRates,
  getAvailableMarketTypes,
  getRateTitle,
  getMarketTitle,
  getNotificationTitle,
  getNotificationSettings,
  getRateValue,
  getRateChange,
  fetch: fetcher,
  promiseRetry,
};
