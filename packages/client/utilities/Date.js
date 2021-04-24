import AmbitoDolar from '@ambito-dolar/core';

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
  date(date, { short = false } = {}) {
    if (date) {
      date = this.get(date);
      if (short === false) {
        return date.format('DD/MM/YY');
      }
      return date.format('D/M');
    }
  },
  datetime(date, { short = false, seconds = false, long = false } = {}) {
    if (date) {
      date = this.get(date);
      if (short === true) {
        if (seconds === true) {
          return date.format('DD/MM/YY HH:mm:ss');
        }
        return date.format('DD/MM/YY HH:mm');
      }
      if (long === true) {
        return date.format('ddd, D [de] MMM [de] YYYY HH:mm');
      }
      return date.format('ddd, DD/MM/YY HH:mm');
    }
  },
};
