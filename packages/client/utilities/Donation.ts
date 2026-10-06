const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// distinct usage days before re-show, count=0 uses shorter wait to invite casuals
export const getCooldownDays = (ignoreCount = 0) => {
  if (ignoreCount === 0) {
    return 15;
  }
  if (ignoreCount === 1) {
    return 30;
  }
  if (ignoreCount === 2) {
    return 45;
  }
  if (ignoreCount === 3) {
    return 60;
  }
  return 75;
};

// re-ask cadence tiered by lifetime total (USD)
export const getReAskMs = (lifetimeTotal = 0) => {
  if (lifetimeTotal < 2) {
    return 3 * MONTH_MS;
  }
  if (lifetimeTotal < 10) {
    return 6 * MONTH_MS;
  }
  return 12 * MONTH_MS;
};

// sum lifetime in local currency via current product prices (approximation)
export const computeLifetime = (transactions = [], priceMap = {}) =>
  transactions.reduce(
    (sum, tx) => sum + (priceMap[tx?.productIdentifier ?? ''] ?? 0),
    0,
  );

// the usage day gate, runs before the re-ask so a donor waits for both
export const getDonationCooldown = (daysUsed, ignoreDaysUsed, ignoreCount) => {
  const cooldownDays = getCooldownDays(ignoreCount);
  const elapsedDays = Math.max(0, daysUsed - (ignoreDaysUsed ?? 0));
  return { cooldownDays, elapsedDays, due: elapsedDays >= cooldownDays };
};

// the ask after a donation, someone who never donated is always due
export const getDonationReAsk = (customerInfo, priceMap) => {
  // server time of the snapshot, a cached one only delays the ask
  const now = Date.parse(customerInfo?.requestDate) || Date.now();
  const transactions = customerInfo?.nonSubscriptionTransactions ?? [];
  const lastPurchaseDate = transactions[transactions.length - 1]?.purchaseDate;
  const lifetimeTotal = computeLifetime(transactions, priceMap);
  const reAskMs = lastPurchaseDate ? getReAskMs(lifetimeTotal) : null;
  const due =
    !lastPurchaseDate || now - new Date(lastPurchaseDate).getTime() >= reAskMs;
  return { lastPurchaseDate, lifetimeTotal, reAskMs, due };
};

// one donation modal at a time, a usage day crossing midnight must not present another
export const donationModal = { open: false };
