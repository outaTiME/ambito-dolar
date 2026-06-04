// @ts-nocheck
import React from 'react';
import Purchases from 'react-native-purchases';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

// module-level state dedupes parallel fetches, boot attempt runs once per session
let inflight: Promise<any[]> | null = null;
let autoAttempted = false;

const fetchProductsOnce = () => {
  if (inflight) {
    return inflight;
  }
  // mock products in dev so the donation modal renders on emulators
  // and simulators without live store billing
  if (__DEV__) {
    const mockCatalog = {
      small_contribution: {
        identifier: 'small_contribution',
        price: 0.99,
        priceString: 'US$0,99',
        title: 'Small',
        currencyCode: 'USD',
      },
      medium_contribution: {
        identifier: 'medium_contribution',
        price: 2.99,
        priceString: 'US$2,99',
        title: 'Medium',
        currencyCode: 'USD',
      },
      large_contribution: {
        identifier: 'large_contribution',
        price: 4.99,
        priceString: 'US$4,99',
        title: 'Large',
        currencyCode: 'USD',
      },
    };
    inflight = Promise.resolve(
      Settings.DONATION_PRODUCT_IDS.map((id) => mockCatalog[id]).filter(
        Boolean,
      ),
    ).finally(() => {
      inflight = null;
    });
    return inflight;
  }
  inflight = Purchases.getProducts(
    Settings.DONATION_PRODUCT_IDS,
    Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
  )
    .then((items) => (items ?? []).sort((a, b) => a.price - b.price))
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
    if (purchasesConfigured && !products.length && !autoAttempted) {
      autoAttempted = true;
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
