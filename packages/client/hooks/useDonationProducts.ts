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
    const mockProducts = [
      {
        identifier: 'small_contribution',
        price: 0.99,
        priceString: 'US$0,99',
        title: 'Small',
        currencyCode: 'USD',
      },
      {
        identifier: 'medium_contribution',
        price: 2.99,
        priceString: 'US$2,99',
        title: 'Medium',
        currencyCode: 'USD',
      },
      {
        identifier: 'large_contribution',
        price: 4.99,
        priceString: 'US$4,99',
        title: 'Large',
        currencyCode: 'USD',
      },
      {
        identifier: 'extra_large_contribution',
        price: 9.99,
        priceString: 'US$9,99',
        title: 'Extra large',
        currencyCode: 'USD',
      },
    ];
    inflight = Promise.resolve(mockProducts).finally(() => {
      inflight = null;
    });
    return inflight;
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

// shared cache plus silent boot fetch
// consumers call ensureProducts() on tap to await in-flight or trigger a fresh attempt when empty
export const useDonationProducts = () => {
  const [purchasesConfigured] = Helper.useSharedState(
    'purchasesConfigured',
    false,
  );
  const [products, setProducts] = Helper.useSharedState('donationProducts', []);
  const fetchAndCache = React.useCallback(async () => {
    const items = await fetchProductsOnce();
    if (items.length) {
      setProducts(items);
    }
    return items;
  }, [setProducts]);
  React.useEffect(() => {
    if (purchasesConfigured && !products.length) {
      fetchAndCache();
    }
  }, [purchasesConfigured, products.length, fetchAndCache]);
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
