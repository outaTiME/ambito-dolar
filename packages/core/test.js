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
