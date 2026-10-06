// @ts-nocheck
import AmbitoDolar from '@ambito-dolar/core';
import { Platform } from 'react-native';

import I18n from '@/config/I18n';
import Settings from '@/config/settings';

// a series dated by day goes without the time, it would read as midnight
const shortRelative = (date, time = true) => {
  const now = AmbitoDolar.getDate();
  const diffMin = now.diff(date, 'minute');
  if (time && diffMin < 1) {
    return I18n.t('now');
  }
  if (time && diffMin < 60) {
    return I18n.t('ago_minutes', { count: diffMin });
  }
  const hour = time ? ` ${date.format('HH:mm')}` : '';
  if (date.isSame(now, 'day')) {
    return `${I18n.t('today')}${hour}`;
  }
  // clone now to avoid moment mutation poisoning subsequent checks
  const yesterday = now.clone().subtract(1, 'day');
  if (date.isSame(yesterday, 'day')) {
    return `${I18n.t('yesterday')}${hour}`;
  }
  if (now.diff(date, 'day') < 7) {
    return AmbitoDolar.getCapitalized(date.format(time ? 'ddd HH:mm' : 'ddd'));
  }
  return date.format(date.isSame(now, 'year') ? 'DD/MM' : 'DD/MM/YY');
};

export default {
  get(date = undefined, format = undefined) {
    return AmbitoDolar.getDate(date, format);
  },
  formatRange(from, to) {
    from = this.get(from);
    to = this.get(to);
    if (from.isSame(to, 'year')) {
      if (from.isSame(to, 'month')) {
        return `${from.date()} ${Settings.DASH_SEPARATOR} ${to.format('ll')}`;
      }
      return `${from.format('D [de] MMM')} al ${to.format('ll')}`;
    }
    return `${from.format('ll')} al ${to.format('ll')}`;
  },
  /* date(date, { short = false, long = false } = {}) {
    if (date) {
      date = this.get(date);
      if (short === true) {
        return date.format('D/M');
      }
      if (long === true) {
        return date.format('ll');
      }
      return date.format('DD/MM/YY');
    }
  },
  datetime(date, { short = false, seconds = false, long = false } = {}) {
    date = this.get(date);
    if (short === true) {
      if (seconds === true) {
        return date.format('DD/MM/YY HH:mm:ss');
      }
      return date.format('DD/MM/YY HH:mm');
    }
    if (long === true) {
      return date.format('dddd, D [de] MMM [de] YYYY HH:mm');
    }
    return date.format('ddd, DD/MM/YY HH:mm');
  }, */
  humanize(date, style) {
    date = this.get(date);
    if (style === 'card') {
      // rate view with relative dates off, and the android widget card. Padded hour so
      // every row keeps the same width, same as the ios widget dd/MM HH:mm
      if (Platform.OS === 'web') {
        // return date.format('ddd, D MMM HH:mm');
      }
      // return date.format('D MMM HH:mm');
      return date.format('DD/MM HH:mm');
    } else if (style === 'chart') {
      // timestamp on web, rate chart
      return date.format('dddd, D [de] MMM [de] YYYY H:mm');
    } else if (style === 'axis') {
      // rate chart axis
      return date.format('D/M');
    } else if (style === 'detail') {
      // rate raw detail, all-time_high rate, timestamp on web (condensed)
      return date.format('ddd, D MMM YYYY H:mm');
    } else if (style === 'relative') {
      // card date relative on native, web stays absolute
      if (Platform.OS === 'web') {
        return date.format('DD/MM HH:mm');
      }
      return shortRelative(date);
    } else if (style === 'header') {
      // header subtitle day reference capitalized
      return AmbitoDolar.getCapitalized(date.format('ddd, D MMM'));
    }
    // statistics
    return date.format('DD/MM/YY H:mm');
  },
  // the humanize styles for a series dated by day, in the market timezone
  humanizeDay(date, style) {
    date = AmbitoDolar.getTimezoneDate(date);
    if (style === 'relative' && Platform.OS !== 'web') {
      return shortRelative(date, false);
    } else if (style === 'chart') {
      return date.format('dddd, D [de] MMM [de] YYYY');
    } else if (style === 'axis') {
      return date.format('D/M');
    } else if (style === 'detail') {
      return date.format('ddd, D MMM YYYY');
    }
    return date.format('DD/MM');
  },
};
