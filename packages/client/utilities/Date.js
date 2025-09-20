import AmbitoDolar from '@ambito-dolar/core';
import { Platform } from 'react-native';

import Settings from '../config/settings';

export default {
  get(date, format) {
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
    if (style === 1) {
      // rate view
      if (Platform.OS === 'web') {
        // return date.format('ddd, D MMM H:mm');
      }
      // return date.format('D MMM H:mm');
      return date.format('DD/MM H:mm');
    } else if (style === 2) {
      // timestamp on web, rate chart
      return date.format('dddd, D [de] MMM [de] YYYY H:mm');
    } else if (style === 3) {
      // rate chart axis
      return date.format('D/M');
    } else if (style === 4) {
      // rate all-time_high (DEPRECATED)
      // return date.format('dddd, D [de] MMM [de] YYYY');
    } else if (style === 5) {
      // rate raw detail, all-time_high rate, timestamp on web (condensed)
      return date.format('ddd, D MMM YYYY H:mm');
    } else if (style === 6) {
      // screenshot (DEPRECATED)
      // return date.format('D MMM YYYY H:mm');
    }
    // rate raw detail, screenshot and statistics
    return date.format('DD/MM/YY H:mm');
  },
};
