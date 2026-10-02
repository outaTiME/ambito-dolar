// @ts-nocheck
import AmbitoDolar from '@ambito-dolar/core';
import * as _ from 'lodash';

import * as actions from '@/actions';
import I18n from '@/config/I18n';
import DateUtils from '@/utilities/Date';
import Helper from '@/utilities/Helper';
import {
  goToCustomizeMarketsModal,
  goToCustomizeRatesModal,
  goBack,
  goToMarketDetail,
  goToMarketRawDetail,
  goToRateDetail,
  goToRateRawDetail,
  goToRatesWithPopToTop,
} from '@/utilities/Navigation';

// display rules per market, the order and titles come from core
const MARKETS = {
  // a monthly figure, the dates name its month instead of the last day
  [AmbitoDolar.INFLATION_TYPE]: {
    suffix: '%',
    points: true,
    inverse: true,
    dated: 'month',
  },
  [AmbitoDolar.INFLATION_ANNUAL_TYPE]: {
    suffix: '%',
    points: true,
    inverse: true,
    dated: 'month',
  },
  // dated by day with no time behind
  [AmbitoDolar.TERM_DEPOSIT_TYPE]: { suffix: '%', points: true, dated: 'day' },
  [AmbitoDolar.UVA_TYPE]: { dated: 'day' },
  [AmbitoDolar.COUNTRY_RISK_TYPE]: {
    decimals: 0,
    suffix: ' pb',
    inverse: true,
  },
  [AmbitoDolar.MERVAL_TYPE]: { decimals: 0, suffix: ' pts' },
  [AmbitoDolar.RESERVES_TYPE]: {
    decimals: 0,
    prefix: 'US$',
    suffix: ' M',
    dated: 'day',
  },
};

const getMarket = (type) => MARKETS[type] ?? {};

// same styles as DateUtils.humanize, in the market timezone, never the device one
const formatMarketDate = (type, timestamp, style) => {
  const { dated } = getMarket(type);
  if (dated === 'month') {
    const date = AmbitoDolar.getTimezoneDate(timestamp);
    if (style === 3) {
      return date.format('MM/YY');
    }
    // the card names the month alone
    return AmbitoDolar.getCapitalized(
      date.format(style === 7 || style === 1 ? 'MMMM' : 'MMMM YYYY'),
    );
  }
  if (dated === 'day') {
    return DateUtils.humanizeDay(timestamp, style);
  }
  return DateUtils.humanize(timestamp, style);
};

// the unit is on the header, the axis keeps the number alone
const formatMarketAxis = (type, value) => {
  const { decimals = 2 } = getMarket(type);
  return AmbitoDolar.formatNumber(value, decimals, decimals > 0);
};

const formatMarketValue = (type, value) => {
  const { prefix = '', suffix = '' } = getMarket(type);
  return prefix + formatMarketAxis(type, value) + suffix;
};

// the detail summary shows the difference alone, a row drops the arrow of the card, same as the rates
const formatMarketChange = (type, stat, mode = 'card') => {
  const { decimals = 2, points } = getMarket(type);
  // the first point of a history has no previous one, its percentage gives it back
  const close =
    stat[3] ?? (stat[2] == null ? null : stat[1] / (1 + stat[2] / 100));
  // rounded first, a float residue would truncate a whole step down
  const diff = close == null ? 0 : _.round(stat[1] - close, decimals);
  const value =
    (diff > 0 ? '+' : '') +
    AmbitoDolar.formatNumber(diff, decimals, decimals > 0);
  if (mode === 'diff') {
    return value;
  }
  // a percentage moves in points, the others in percent
  const text = points ? value : AmbitoDolar.formatRateChange(stat[2]);
  if (mode === 'row') {
    return text;
  }
  const symbol = diff === 0 ? '=' : diff > 0 ? '↑' : '↓';
  return `${text} ${symbol}`;
};

// the first range is the stats already in the payload, the rest come from the historical file
const RANGES = [
  { label: I18n.t('one_week') },
  { label: I18n.t('one_month'), from: (to) => to.clone().subtract(1, 'month') },
  {
    label: I18n.t('three_months'),
    from: (to) => to.clone().subtract(3, 'months'),
  },
  {
    label: I18n.t('six_months'),
    from: (to) => to.clone().subtract(6, 'months'),
  },
  { label: I18n.t('year'), from: (to) => to.clone().startOf('year') },
  { label: I18n.t('one_year'), from: (to, first) => first },
];

// a monthly series, the payload already spans six months and year to date can hold a single point
const MONTHLY_RANGES = [{ label: I18n.t('six_months') }, RANGES[5]];

// what tells rates and markets apart, the screens stay the same for both
const KINDS = {
  rates: {
    useItems: (customized) => Helper.useRates(customized),
    getTitle: AmbitoDolar.getRateTitle,
    // the card keeps its own formats
    getViewProps: () => null,
    formatValue: (type, value) => Helper.getCurrency(value),
    formatChange: (type, stat) =>
      AmbitoDolar.getRateChange([null, stat[1], null, stat[3]]),
    formatDate: (type, timestamp, style) =>
      DateUtils.humanize(timestamp, style),
    getRanges: () => RANGES,
    goToDetail: goToRateDetail,
    goToRawDetail: goToRateRawDetail,
    goToCustomize: goToCustomizeRatesModal,
    goToRoot: goToRatesWithPopToTop,
    summaryTitle: 'day_summary',
    previousLabel: 'previous_close',
    excludedKey: 'excluded_rates',
    typesKey: 'rate_types',
    exclude: actions.excludeRate,
    updateTypes: actions.updateRateTypes,
    restore: actions.restoreCustomization,
    hasOrder: true,
    hasSpreads: true,
    refetchOnUpdate: true,
  },
  markets: {
    useItems: (customized) => Helper.useMarkets(customized),
    getTitle: AmbitoDolar.getMarketTitle,
    getViewProps: (type) => ({
      formatValue: (value) => formatMarketValue(type, value),
      formatChange: (stat) => formatMarketChange(type, stat),
      formatRowChange: (stat) => formatMarketChange(type, stat, 'row'),
      formatAxis: (value) => formatMarketAxis(type, value),
      inverse: getMarket(type).inverse === true,
      formatDate: (timestamp, style) =>
        formatMarketDate(type, timestamp, style),
    }),
    formatValue: formatMarketValue,
    formatChange: (type, stat) => formatMarketChange(type, stat, 'diff'),
    formatDate: formatMarketDate,
    // a monthly series has too few points for the short ranges
    getRanges: (type) =>
      getMarket(type).dated === 'month' ? MONTHLY_RANGES : RANGES,
    goToDetail: goToMarketDetail,
    goToRawDetail: goToMarketRawDetail,
    goToCustomize: goToCustomizeMarketsModal,
    // markets are only customized from their list, a missing one just goes back
    goToRoot: goBack,
    // not every market trades by the day, nor closes
    summaryTitle: 'summary',
    previousLabel: 'previous_value',
    excludedKey: 'excluded_markets',
    typesKey: 'market_types',
    exclude: actions.excludeMarket,
    updateTypes: actions.updateMarketTypes,
    restore: actions.restoreMarketsCustomization,
  },
};

export const getKind = (kind = 'rates') => KINDS[kind];
