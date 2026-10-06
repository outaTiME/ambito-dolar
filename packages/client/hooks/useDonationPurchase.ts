// @ts-nocheck
import React from 'react';
import { useDispatch } from 'react-redux';

import * as actions from '@/actions';
import { purchaseDonation } from '@/utilities/Donation';

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
