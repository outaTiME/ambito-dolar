const test = require('ava');

const AmbitoDolar = require('.');

// timezone forcing
// process.env.TZ = 'UTC';
// process.env.TZ = 'America/Los_Angeles';

test('dates should use the default timezone', function (t) {
  const utc_offset = AmbitoDolar.getTimezoneDate().utcOffset();
  t.is(
    AmbitoDolar.getDate().utcOffset(utc_offset).format(),
    AmbitoDolar.getTimezoneDate().format()
  );
  t.is(
    AmbitoDolar.getTimezoneDate('2021-03-08').format(),
    '2021-03-08T00:00:00-03:00'
  );
  t.is(
    AmbitoDolar.getTimezoneDate('2021-03-08T12:00:00').format(),
    '2021-03-08T12:00:00-03:00'
  );
  t.is(
    AmbitoDolar.getTimezoneDate('2021-03-08T12:00:00-03:00').format(),
    '2021-03-08T12:00:00-03:00'
  );
  t.is(
    AmbitoDolar.getTimezoneDate(
      '2021-03-08T12:00:00-03:00',
      undefined,
      true
    ).format(),
    '2021-03-08T00:00:00-03:00'
  );
  const moment_from = AmbitoDolar.getTimezoneDate(
    '2020-10-23T16:15:08-03:00'
  ).subtract(1, 'year');
  const moment_to = AmbitoDolar.getTimezoneDate('2020-10-15T16:25:06-03:00');
  const timestamp = '2019-10-23';
  const moment_timestamp = AmbitoDolar.getTimezoneDate(timestamp);
  t.true(
    moment_timestamp.isBetween(
      moment_from,
      moment_to,
      'day',
      // moment_to exclusion
      '[)'
    )
  );
});

test('should parse date from a natural language string', function (t) {
  // default value for time is 12:00 on "chrono-node" parse
  const date_str = '2021-03-08T12:00:00-03:00';
  t.is(AmbitoDolar.parseNaturalDate('08-03-2021'), date_str);
  t.is(AmbitoDolar.parseNaturalDate('08/03/2021'), date_str);
  t.is(AmbitoDolar.parseNaturalDate('2021-03-08'), date_str);
  t.is(AmbitoDolar.parseNaturalDate('2021/03/08'), date_str);
  t.is(
    AmbitoDolar.parseNaturalDate('An appointment on March 8, 2021'),
    date_str
  );
});

test('number should be formatted as a percentage', function (t) {
  t.is(AmbitoDolar.formatRateChange(10), '+10,00%');
  t.is(AmbitoDolar.formatRateChange(0), '0,00%');
  t.is(AmbitoDolar.formatRateChange(-10), '-10,00%');
});

test('number should be formatted as currency', function (t) {
  t.is(AmbitoDolar.formatRateCurrency(1000.5), '1.000,50');
});

test('should return a number from a percentage string', function (t) {
  t.is(AmbitoDolar.getPercentNumberValue('0,04%'), 0.04);
});

test('rate should be of the day', function (t) {
  const today = AmbitoDolar.getTimezoneDate();
  t.true(AmbitoDolar.isRateFromToday([today]));
  const yesterday = AmbitoDolar.getTimezoneDate().subtract(1, 'day');
  t.false(AmbitoDolar.isRateFromToday([yesterday]));
});
