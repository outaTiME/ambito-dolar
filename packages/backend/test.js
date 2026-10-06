import test from 'ava';

import Shared from './src/libs/shared.js';

test('Next rate stat should keep the close and notify past the threshold', (t) => {
  const next = (rate, rate_last, date = '2026-10-05T12:00:00-03:00') =>
    Shared.getNextRateStat(rate, {
      rate_last,
      date,
      rate_hash: 'h',
      getThreshold: () => 5,
    });
  const yesterday = ['2026-10-04T17:00:00-03:00', 100, 0, 98, 100, 'x'];
  // the first value of the day closes on the last one of yesterday
  t.deepEqual(next(yesterday, 110).stat, [
    '2026-10-05T12:00:00-03:00',
    110,
    10,
    100,
    110,
    'h',
  ]);
  const today = ['2026-10-05T11:00:00-03:00', 104, 4, 100, 100, 'x'];
  // same day keeps the close, under the threshold keeps the notified value
  t.deepEqual(next(today, 103).stat, [
    '2026-10-05T12:00:00-03:00',
    103,
    3,
    100,
    100,
    'h',
  ]);
  t.false(next(today, 103).variation.should_notify);
  // a pair counts by its highest value
  t.true(next(today, [104, 106]).variation.should_notify);
  t.is(next(today, [104, 106]).stat[4], 106);
  // a first value ever has no change
  t.deepEqual(next(undefined, 50).stat.slice(1, 5), [50, 0, 50, 50]);
});

test('Stats should merge by market day', (t) => {
  const stats = [
    ['2026-10-01T18:00:00-03:00', 1, 0, 1, 1, 'h'],
    ['2026-10-02T18:00:00-03:00', 2, 0, 1, 1, 'h'],
  ];
  const stat = ['2026-10-02T12:00:00-03:00', 3, 0, 1, 1, 'h'];
  // same day replaced, older ones lose the open and the hash
  t.deepEqual(Shared.addStat(stats, stat, 6), [
    ['2026-10-01T18:00:00-03:00', 1, 0],
    stat,
  ]);
  t.deepEqual(Shared.addStat(stats, stat, 1), [stat]);
  t.deepEqual(Shared.addStat(undefined, stat, 6), [stat]);
  // a stored null counts as no stats
  t.deepEqual(Shared.addStat(null, stat, 6), [stat]);
  t.deepEqual(Shared.mergeHistoricalStats(null, [stat]), [
    ['2026-10-02T12:00:00-03:00', 3, 0],
  ]);
  // the history keeps only the days before the first new one
  t.deepEqual(Shared.mergeHistoricalStats(stats, [stat]), [
    ['2026-10-01T18:00:00-03:00', 1, 0, 1, 1, 'h'],
    ['2026-10-02T12:00:00-03:00', 3, 0],
  ]);
});

test('Notifications should follow the day and the notified value', (t) => {
  const rates = { a: ['d', 1, 0, 1, 100], b: ['d', 1, 0, 1, 100] };
  const new_rates = { a: ['d', 2, 0, 1, 100], b: ['d', 2, 0, 1, 101] };
  const types = (args) =>
    Shared.getNotifications({ rates, new_rates, ...args }).notifications;
  t.deepEqual(types({ close_day: true }), [
    ['close', { a: new_rates.a, b: new_rates.b }],
  ]);
  t.deepEqual(types({ has_rates_from_today: false }), [
    ['open', { a: new_rates.a, b: new_rates.b }],
  ]);
  // only the rate whose notified value moved goes out
  t.deepEqual(types({ has_rates_from_today: true }), [
    ['variation', { b: new_rates.b }],
  ]);
  t.deepEqual(
    Shared.getNotifications({ rates, new_rates: {} }).notifications,
    [],
  );
});

test('Body message should lead with the biggest movers', (t) => {
  t.is(
    Shared.getBodyMessage({
      oficial: ['d', 1000, 0.5],
      informal: ['d', [1200, 1234.5], -1.23],
      ccb: ['d', 1300, 0],
    }),
    'BLUE 1.234,5 ↓1,23%, OFICIAL 1.000 ↑0,5%, CRIPTO 1.300',
  );
  t.is(
    Shared.getSocialCaption('close', { oficial: ['d', 1000, 0] }),
    'Cierre de jornada. OFICIAL 1.000',
  );
  t.is(Shared.getBodyMessage({}), undefined);
});
