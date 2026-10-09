import AmbitoDolar from '@ambito-dolar/core';
import test from 'ava';

import { getSortedRates } from './utilities/Customize.ts';
import {
  getCooldownDays,
  getDonationCooldown,
  getDonationReAsk,
  getReAskMs,
} from './utilities/Donation.ts';
import { getPollInterval } from './utilities/Polling.ts';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

test('Polling should only slow down from the payload cadence', (t) => {
  t.is(getPollInterval(undefined, true, MINUTE), MINUTE);
  // a remote cadence under the minimum never speeds the app up
  t.is(getPollInterval(10 * 1000, true, MINUTE), MINUTE);
  t.is(getPollInterval(5 * MINUTE, true, MINUTE), 5 * MINUTE);
  t.is(getPollInterval(NaN, true, MINUTE), MINUTE);
  t.is(getPollInterval('5', true, MINUTE), MINUTE);
  t.is(getPollInterval(undefined, false, MINUTE), 5 * MINUTE);
  // an unknown market state polls as open
  t.is(getPollInterval(undefined, null, MINUTE), MINUTE);
  // capped at one hour whatever the payload asks
  t.is(getPollInterval(30 * MINUTE, false, MINUTE), 60 * MINUTE);
  t.is(getPollInterval(2 * 60 * MINUTE, true, MINUTE), 60 * MINUTE);
});

test('Donation cooldown should wait more usage days after each dismiss', (t) => {
  t.deepEqual(
    [0, 1, 2, 3, 4, 9].map(getCooldownDays),
    [15, 30, 45, 60, 75, 75],
  );
  t.deepEqual(getDonationCooldown(14, null, 0), {
    cooldownDays: 15,
    elapsedDays: 14,
    due: false,
  });
  t.true(getDonationCooldown(15, undefined, 0).due);
  // counted from the usage day of the last dismiss
  t.false(getDonationCooldown(40, 20, 1).due);
  t.true(getDonationCooldown(50, 20, 1).due);
});

test('Donation re-ask should follow the total and the server time', (t) => {
  const prices = { small: 1, large: 5 };
  const info = (purchaseDate, productIdentifier, requestDate) => ({
    requestDate,
    nonSubscriptionTransactions: [{ purchaseDate, productIdentifier }],
  });
  t.true(getDonationReAsk({ nonSubscriptionTransactions: [] }, prices).due);
  t.true(getDonationReAsk(null, prices).due);
  t.is(getReAskMs(1), 90 * DAY);
  t.is(getReAskMs(5), 180 * DAY);
  t.is(getReAskMs(10), 360 * DAY);
  const bought = '2026-01-01T00:00:00Z';
  const at = (days) => new Date(Date.parse(bought) + days * DAY).toISOString();
  t.false(getDonationReAsk(info(bought, 'small', at(89)), prices).due);
  t.true(getDonationReAsk(info(bought, 'small', at(90)), prices).due);
  // a bigger total waits longer
  t.false(getDonationReAsk(info(bought, 'large', at(90)), prices).due);
  t.true(getDonationReAsk(info(bought, 'large', at(180)), prices).due);
});

// the payload a release serves next to what an older one persisted
const stat = (value, change = 0, timestamp = '2026-10-07T15:00:00-03:00') => ({
  stats: [[timestamp, value, change]],
});
const shown = (rates, excluded, order, types, direction) =>
  Object.keys(
    getSortedRates(
      AmbitoDolar.getAvailableRates(rates),
      order,
      direction,
      excluded,
      types,
    ),
  );

test('Customize should show what the payload carries minus the excluded', (t) => {
  const rates = { oficial: stat(1), informal: stat(2), mep: stat(3) };
  t.deepEqual(shown(rates, null), ['oficial', 'informal', 'mep']);
  t.deepEqual(shown(rates, ['informal']), ['oficial', 'mep']);
  // every type excluded, also when the only rate left on was retired, leaves nothing and the
  // screen shows its empty view with Seleccionar
  t.deepEqual(shown(rates, ['oficial', 'informal', 'mep']), []);
});

test('Customize should ignore a persisted type the payload no longer carries', (t) => {
  const rates = { oficial: stat(1), informal: stat(2) };
  // excluded and ordered by an older release, retired or missing from this payload
  t.deepEqual(shown(rates, ['qatar', 'mep']), ['oficial', 'informal']);
  t.deepEqual(shown(rates, null, 'custom', ['qatar', 'informal', 'oficial']), [
    'informal',
    'oficial',
  ]);
});

test('Customize should show a new type that no persisted state names', (t) => {
  const rates = { oficial: stat(1), informal: stat(2), mep: stat(3) };
  // last in a custom order saved before it existed
  t.deepEqual(shown(rates, null, 'custom', ['informal', 'oficial']), [
    'informal',
    'oficial',
    'mep',
  ]);
});

test('Customize should order by the persisted criterion and direction', (t) => {
  const rates = {
    oficial: stat([1490, 1540], -0.5, '2026-10-07T16:15:00-03:00'),
    informal: stat([1535, 1555], 0.97, '2026-10-07T11:50:00-03:00'),
    mep: stat(1539, -0.13, '2026-10-07T17:05:00-03:00'),
  };
  // an older stat first, every criterion reads the last one
  rates.mep.stats.unshift(['2026-10-06T17:05:00-03:00', 1600, 2]);
  const sorted = (order, direction, types) =>
    shown(rates, null, order, types, direction);
  // the core order, the default and its reverse
  t.deepEqual(sorted(), ['oficial', 'informal', 'mep']);
  t.deepEqual(sorted('default', 'desc'), ['mep', 'informal', 'oficial']);
  // by title, Blue sorts before MEP and Oficial
  t.deepEqual(sorted('name'), ['informal', 'mep', 'oficial']);
  // by the higher end of a pair, 1540 for oficial against 1539 for mep
  t.deepEqual(sorted('price'), ['mep', 'oficial', 'informal']);
  t.deepEqual(sorted('price', 'desc'), ['informal', 'oficial', 'mep']);
  t.deepEqual(sorted('change'), ['oficial', 'mep', 'informal']);
  t.deepEqual(sorted('update', 'desc'), ['mep', 'oficial', 'informal']);
  t.deepEqual(sorted('custom', 'asc', ['mep', 'oficial', 'informal']), [
    'mep',
    'oficial',
    'informal',
  ]);
  // without a saved custom order it keeps the core one
  t.deepEqual(sorted('custom'), ['oficial', 'informal', 'mep']);
});
