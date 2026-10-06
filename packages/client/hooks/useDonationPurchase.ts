// @ts-nocheck
import React from 'react';
import { Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import { useDispatch } from 'react-redux';

import * as actions from '@/actions';
import I18n from '@/config/I18n';
import Sentry from '@/utilities/Sentry';

export const showGenericErrorAlert = () => {
  Alert.alert(I18n.t('generic_error'), '', [{ text: I18n.t('accept') }], {
    cancelable: false,
  });
};

// ask to buy or a pending store payment, it completes outside the app
const isPurchasePending = (e) =>
  e?.code === Purchases.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR;

const showPurchaseErrorAlert = (e) => {
  if (e?.userCancelled || isPurchasePending(e)) {
    return;
  }
  Sentry.captureException(new Error('Purchase error', { cause: e }));
  showGenericErrorAlert();
};

// true once the store charged, a failure is already reported here
export const purchaseDonation = (product) =>
  Purchases.purchaseStoreProduct(product).then(
    () => true,
    (e) => {
      showPurchaseErrorAlert(e);
      return false;
    },
  );

// one purchase at a time, a second tap while one is in flight does nothing
export const useDonationPurchase = (onDonated) => {
  const dispatch = useDispatch();
  const [loadingProductId, setLoadingProductId] = React.useState(null);
  // mirrors loadingProductId so dismiss callbacks see the latest value
  const loadingRef = React.useRef(false);
  const donate = async (product, productId = product.identifier) => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    setLoadingProductId(productId);
    try {
      if (await purchaseDonation(product)) {
        dispatch(actions.registerApplicationDonation());
        onDonated?.();
      }
    } finally {
      loadingRef.current = false;
      setLoadingProductId(null);
    }
  };
  return { loadingProductId, loadingRef, donate };
};
