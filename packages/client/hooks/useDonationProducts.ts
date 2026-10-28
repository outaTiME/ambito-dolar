// @ts-nocheck
import React from 'react';
import Purchases from 'react-native-purchases';

import Helper from '@/utilities/Helper';

// module-level state dedupes parallel fetches
let inflight = null;

const fetchProductsOnce = () => {
  if (inflight) {
    return inflight;
  }
  // mock products in dev, emulators and simulators have no live store billing
  if (__DEV__) {
    return Promise.resolve(
      [
        ['small', 0.99],
        ['medium', 2.99],
        ['large', 4.99],
        ['extra_large', 9.99],
      ].map(([size, price]) => ({ identifier: `${size}_contribution`, price })),
    );
  }
  // the current offering drives the ladder, so tiers move without a release
  inflight = Purchases.getOfferings()
    .then((offerings) =>
      (offerings?.current?.availablePackages ?? [])
        .map((item) => item.product)
        .sort((a, b) => a.price - b.price),
    )
    .catch(() => [])
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

// shared cache, filled by withAppDonation or by ensureProducts() on tap
export const useDonationProducts = () => {
  const [products, setProducts] = Helper.useSharedState('donationProducts', []);
  const fetchAndCache = React.useCallback(async () => {
    const items = await fetchProductsOnce();
    if (items.length) {
      setProducts(items);
    }
    return items;
  }, [setProducts]);
  const ensureProducts = React.useCallback(
    async () => (products.length ? products : fetchAndCache()),
    [products, fetchAndCache],
  );
  const priceMap = React.useMemo(
    () => Object.fromEntries(products.map((p) => [p.identifier, p.price])),
    [products],
  );
  return { products, priceMap, ensureProducts };
};

// the app currency format, rounded so toFixedNoRounding does not show 2.99 as 2.98
export const formatProductPrice = (product) =>
  Helper.getCurrency(Math.round(product.price * 100) / 100, true, true);
