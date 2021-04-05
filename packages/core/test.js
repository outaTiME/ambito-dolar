const test = require('ava');

const AmbitoDolar = require('.');

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

test('should parse the date from a string', function (t) {
  // ignore timezone as natural parse
  const date = AmbitoDolar.getTimezoneDate('2021-03-31', undefined, true);
  t.true(date.isSame(AmbitoDolar.parseNaturalDate('31-03-2021'), 'day'));
  t.true(date.isSame(AmbitoDolar.parseNaturalDate('31/03/2021'), 'day'));
  t.true(date.isSame(AmbitoDolar.parseNaturalDate('2021-03-31'), 'day'));
  t.true(date.isSame(AmbitoDolar.parseNaturalDate('2021/03/31'), 'day'));
  t.true(
    date.isSame(
      AmbitoDolar.parseNaturalDate('An appointment on March 31, 2021'),
      'day'
    )
  );
});
