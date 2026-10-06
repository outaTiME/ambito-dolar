/* eslint-disable no-sparse-arrays */
import test from 'ava';
import { MockAgent, setGlobalDispatcher } from 'undici';

import AmbitoDolar from './index.js';

const mockAgent = new MockAgent();
mockAgent.disableNetConnect();
setGlobalDispatcher(mockAgent);

const mockPool = mockAgent.get('https://httpbin.org');

mockPool
  .intercept({
    path: '/delay/2',
    method: 'GET',
  })
  .reply(200)
  .delay(2 * 1000);

mockPool
  .intercept({
    path: '/status/500',
    method: 'GET',
  })
  .reply(500);

mockPool
  .intercept({
    path: '/error/ECONNRESET',
    method: 'GET',
  })
  .replyWithError({
    code: 'ECONNRESET',
    message: 'Connection was reset',
  });

test.after.always((t) => {
  t.notThrows(() => mockAgent.assertNoPendingInterceptors());
  return mockAgent.close();
});

test('Dates should use the default timezone', (t) => {
  const date_tz = AmbitoDolar.getTimezoneDate();
  const utc_offset = date_tz.utcOffset();
  t.is(
    date_tz.format(),
    // use valueOf to avoid timezone and use local
    AmbitoDolar.getDate(date_tz.valueOf()).utcOffset(utc_offset).format(),
  );
  t.is(
    AmbitoDolar.getTimezoneDate('2021-03-08T12:00:00-03:00').format(),
    '2021-03-08T12:00:00-03:00',
  );
  t.is(
    AmbitoDolar.getTimezoneDate(
      '2021-03-08T12:00:00-03:00',
      undefined,
      true,
    ).format(),
    '2021-03-08T00:00:00-03:00',
  );
  const moment_from = AmbitoDolar.getTimezoneDate(
    '2020-10-23T16:15:08-03:00',
  ).subtract(1, 'year');
  const moment_to = AmbitoDolar.getTimezoneDate('2020-10-15T16:25:06-03:00');
  const timestamp = '2019-10-23T00:00:00-03:00';
  const moment_timestamp = AmbitoDolar.getTimezoneDate(timestamp);
  t.true(
    moment_timestamp.isBetween(
      moment_from,
      moment_to,
      'day',
      // moment_to exclusion
      '[)',
    ),
  );
  t.is(
    AmbitoDolar.getTimezoneDate('2022-05-13T18:00:39-03:00').unix(),
    1652475639,
  );
  t.is(
    AmbitoDolar.getTimezoneDate(1652475639 * 1000).format(),
    '2022-05-13T18:00:39-03:00',
  );
});

test('Number should be formatted as a percentage', (t) => {
  t.is(AmbitoDolar.formatRateChange(10), '+10,00%');
  t.is(AmbitoDolar.formatRateChange(-10), '-10,00%');
  t.is(AmbitoDolar.formatRateChange(0), '0,00%');
  t.is(AmbitoDolar.formatRateChange(''), null);
  t.is(AmbitoDolar.getRateChange(1), '+1,00%');
  t.is(AmbitoDolar.getRateChange(1, true), '+1,00% ↑');
  t.is(AmbitoDolar.getRateChange([, 208.89, 0.14, 208.58]), '+0,30 (+0,14%)');
  t.is(AmbitoDolar.getRateChange([, [201, 205], 0, 205]), '0,00 (0,00%)');
  // compact
  t.is(AmbitoDolar.formatRateChange(1.5, true, true), '+1,5%');
  t.is(AmbitoDolar.formatRateChange(0, true, true), '');
  t.is(AmbitoDolar.formatRateChange('', true, true), null);
});

test('Number should be formatted as currency', (t) => {
  t.is(AmbitoDolar.formatRateCurrency(1000.5), '1.000,50');
  t.is(AmbitoDolar.formatRateCurrency(-1.0094462868053427), '-1,00');
  t.is(AmbitoDolar.formatRateCurrency(0), '0,00');
  t.is(AmbitoDolar.formatRateCurrency(''), null);
  t.is(AmbitoDolar.formatCurrency(0), '$0,00');
  t.is(AmbitoDolar.formatCurrency(''), null);
  // compact
  t.is(AmbitoDolar.formatRateCurrency(1000.5, true), '1.000,5');
  t.is(AmbitoDolar.formatRateCurrency(1000, true), '1.000');
});

test('Number should be truncated without rounding', (t) => {
  t.is(AmbitoDolar.getNumber(1.0094462868053427), 1);
  t.is(AmbitoDolar.getNumber(-0.39812243262198876), -0.39);
  t.is(AmbitoDolar.getNumber(0.43640854206165614), 0.43);
});

test('Should return a number from a string', (t) => {
  t.is(AmbitoDolar.getNumber('1,00'), 1);
  t.is(AmbitoDolar.getNumber('0,04'), 0.04);
  t.is(AmbitoDolar.getNumber(), 0);
  t.is(AmbitoDolar.getNumber(''), null);
  t.is(AmbitoDolar.getNumber(' '), null);
  t.is(AmbitoDolar.getNumber('a'), null);
});

test('Rate should be of the current day', (t) => {
  const today = AmbitoDolar.getTimezoneDate();
  t.true(AmbitoDolar.isRateFromToday([today]));
  const yesterday = AmbitoDolar.getTimezoneDate().subtract(1, 'day');
  t.false(AmbitoDolar.isRateFromToday([yesterday]));
});

test('Stats in range should use market days', (t) => {
  const year = (to) => to.clone().startOf('year');
  const stats = [
    ['2025-12-31T00:00:00-03:00', 1],
    ['2026-01-01T00:00:00-03:00', 2],
    ['2026-08-31T00:00:00-03:00', 3],
  ];
  // a phone west of buenos aires reads the first of january as december
  process.env.TZ = 'America/Los_Angeles';
  try {
    t.deepEqual(
      AmbitoDolar.getStatsInRange(stats, year).map((stat) => stat[1]),
      [2, 3],
    );
  } finally {
    delete process.env.TZ;
  }
  t.deepEqual(AmbitoDolar.getStatsInRange([], year), []);
  t.deepEqual(AmbitoDolar.getStatsInRange([stats[2]], year), [stats[2]]);
  t.deepEqual(
    AmbitoDolar.getStatsInRange(stats, (to, first) => first),
    stats,
  );
});

test('Next rate stat should keep the close and notify past the threshold', (t) => {
  const threshold = () => 5;
  const next = (rate, rate_last, date = '2026-10-05T12:00:00-03:00') =>
    AmbitoDolar.getNextRateStat(rate, {
      rate_last,
      date,
      rate_hash: 'h',
      getThreshold: threshold,
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
  t.deepEqual(AmbitoDolar.addStat(stats, stat, 6), [
    ['2026-10-01T18:00:00-03:00', 1, 0],
    stat,
  ]);
  t.deepEqual(AmbitoDolar.addStat(stats, stat, 1), [stat]);
  t.deepEqual(AmbitoDolar.addStat(undefined, stat, 6), [stat]);
  // a stored null counts as no stats
  t.deepEqual(AmbitoDolar.addStat(null, stat, 6), [stat]);
  t.deepEqual(AmbitoDolar.mergeHistoricalStats(null, [stat]), [
    ['2026-10-02T12:00:00-03:00', 3, 0],
  ]);
  // the history keeps only the days before the first new one
  t.deepEqual(AmbitoDolar.mergeHistoricalStats(stats, [stat]), [
    ['2026-10-01T18:00:00-03:00', 1, 0, 1, 1, 'h'],
    ['2026-10-02T12:00:00-03:00', 3, 0],
  ]);
});

test('Notifications should follow the day and the notified value', (t) => {
  const rates = { a: ['d', 1, 0, 1, 100], b: ['d', 1, 0, 1, 100] };
  const new_rates = { a: ['d', 2, 0, 1, 100], b: ['d', 2, 0, 1, 101] };
  const types = (args) =>
    AmbitoDolar.getNotifications({ rates, new_rates, ...args }).notifications;
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
    AmbitoDolar.getNotifications({ rates, new_rates: {} }).notifications,
    [],
  );
});

test('Body message should lead with the biggest movers', (t) => {
  t.is(
    AmbitoDolar.getBodyMessage({
      oficial: ['d', 1000, 0.5],
      informal: ['d', [1200, 1234.5], -1.23],
      ccb: ['d', 1300, 0],
    }),
    'BLUE 1.234,5 ↓1,23%, OFICIAL 1.000 ↑0,5%, CRIPTO 1.300',
  );
  t.is(
    AmbitoDolar.getSocialCaption('close', { oficial: ['d', 1000, 0] }),
    'Cierre de jornada. OFICIAL 1.000',
  );
  t.is(AmbitoDolar.getBodyMessage({}), undefined);
});

test('Notification rates should honor the legacy ccl key', (t) => {
  const enabled = (rates, type) =>
    AmbitoDolar.isNotificationRateEnabled({ rates }, type);
  t.true(enabled({ ccl: true }, 'ccl'));
  // a client older than the wholesale rate saved ccl as cl
  t.false(enabled({ ccl: true, cl: false }, 'ccl'));
  t.false(enabled({ ccl: false }, 'ccl'));
  t.true(enabled({ oficial: true }, 'oficial'));
  t.false(enabled({}, 'oficial'));
});

test('Rates should be from today when any of them is', (t) => {
  const today = AmbitoDolar.getTimezoneDate();
  const yesterday = AmbitoDolar.getTimezoneDate().subtract(1, 'day');
  t.false(AmbitoDolar.hasRatesFromToday({ oficial: [yesterday] }));
  // any and not every, one late rate must not silence the others
  t.true(
    AmbitoDolar.hasRatesFromToday({ oficial: [yesterday], informal: [today] }),
  );
});

test('Available rates should drop what is not released yet', (t) => {
  // a gated rate keeps its constant, it is only commented out of the available list
  t.false(AmbitoDolar.getAvailableRates({ [AmbitoDolar.QATAR_TYPE]: 1 }));
  t.truthy(AmbitoDolar.getAvailableRates({ [AmbitoDolar.OFFICIAL_TYPE]: 1 }));
  // the first web render asks with no payload yet
  t.false(AmbitoDolar.getAvailableRates(undefined));
});

test('Notification settings should keep the types independent', (t) => {
  const settings = AmbitoDolar.getNotificationSettings({
    open: { rates: { oficial: false } },
  });
  t.false(settings.open.rates.oficial);
  t.true(settings.close.rates.oficial);
  t.true(settings.close.enabled);
});

test('Fetch should timeout with error', (t) =>
  t.throwsAsync(
    AmbitoDolar.fetch('https://httpbin.org/delay/2', {
      timeout: 1 * 1000,
    }),
    { name: 'TimeoutError' },
  ));

test('Fetch should retry after a network error', (t) => {
  const max_retries = 1;
  let retries = 0;
  return Promise.allSettled(
    [
      'https://httpbin.org/status/500',
      'https://httpbin.org/error/ECONNRESET',
    ].map((url) =>
      AmbitoDolar.fetch(url, {
        retry: max_retries,
        hooks: {
          beforeRetry: [
            () => {
              retries++;
            },
          ],
        },
      }),
    ),
  ).then((results) => {
    t.is(retries, max_retries * results.length);
  });
});
