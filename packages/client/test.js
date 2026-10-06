import test from 'ava';

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
