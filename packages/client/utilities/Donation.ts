// @ts-nocheck
import { Alert } from 'react-native';
import Purchases from 'react-native-purchases';

import I18n from '@/config/I18n';
import Helper from '@/utilities/Helper';
import Sentry from '@/utilities/Sentry';

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// distinct usage days before re-show, count=0 uses shorter wait to invite casuals
export const getCooldownDays = (ignoreCount: number = 0): number => {
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
export const getReAskMs = (lifetimeTotal: number = 0): number => {
  if (lifetimeTotal < 2) {
    return 3 * MONTH_MS;
  }
  if (lifetimeTotal < 10) {
    return 6 * MONTH_MS;
  }
  return 12 * MONTH_MS;
};

type Transaction = { productIdentifier?: string } | null | undefined;

// sum lifetime in local currency via current product prices (approximation)
export const computeLifetime = (
  transactions: Transaction[] = [],
  priceMap: Record<string, number> = {},
): number =>
  transactions.reduce(
    (sum, tx) => sum + (priceMap[tx?.productIdentifier ?? ''] ?? 0),
    0,
  );

export const purchaseDonation = (product) =>
  Purchases.purchaseStoreProduct(product);

export const showGenericErrorAlert = () => {
  Alert.alert(I18n.t('generic_error'), '', [{ text: I18n.t('accept') }], {
    cancelable: false,
  });
};

export const showPurchaseErrorAlert = (e) => {
  if (e?.userCancelled) {
    return;
  }
  Sentry.captureException(new Error('Purchase error', { cause: e }));
  showGenericErrorAlert();
};

// rounded localized currency to avoid toFixedNoRounding truncation (e.g. 2.99 to 2.98)
export const formatProductPrice = (product) =>
  Helper.getCurrency(Math.round((product?.price ?? 0) * 100) / 100, true, true);
