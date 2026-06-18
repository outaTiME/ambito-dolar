// @ts-nocheck
import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { useDispatch } from 'react-redux';

import * as actions from '@/actions';
import CardItemView from '@/components/CardItemView';
import CardView from '@/components/CardView';
import FixedScrollView from '@/components/FixedScrollView';
import MessageView from '@/components/MessageView';
import withContainer from '@/components/withContainer';
import I18n from '@/config/I18n';
import { useDonationProducts } from '@/hooks/useDonationProducts';
import {
  formatProductPrice,
  purchaseDonation,
  showPurchaseErrorAlert,
} from '@/utilities/Donation';

// fall back to store-provided title when i18n key missing
const getLocalTitle = (product) => {
  const key = `donate_product_${product.identifier}`;
  const localized = I18n.t(key, { defaultValue: '' });
  return localized || product.title;
};

const DonateScreen = () => {
  const dispatch = useDispatch();
  const { products } = useDonationProducts();
  const [loadingProductId, setLoadingProductId] = React.useState(null);
  const loadingRef = React.useRef(false);
  const handleDonate = React.useCallback(
    async (product) => {
      if (loadingRef.current) {
        return;
      }
      loadingRef.current = true;
      setLoadingProductId(product.identifier);
      try {
        await purchaseDonation(product);
        dispatch(actions.registerApplicationDonation());
      } catch (e) {
        showPurchaseErrorAlert(e);
      } finally {
        loadingRef.current = false;
        setLoadingProductId(null);
      }
    },
    [dispatch],
  );
  return (
    <FixedScrollView>
      {products.length === 0 ? (
        <MessageView message={I18n.t('donate_unavailable')} />
      ) : (
        <CardView title={I18n.t('donate_choose_title')} plain>
          {products.map((product) => (
            <CardItemView
              key={product.identifier}
              title={getLocalTitle(product)}
              useSwitch={false}
              chevron={false}
              value={formatProductPrice(product)}
              onAction={
                loadingProductId === null
                  ? () => handleDonate(product)
                  : undefined
              }
              loading={loadingProductId === product.identifier}
            />
          ))}
        </CardView>
      )}
    </FixedScrollView>
  );
};

export default compose(withContainer)(DonateScreen);
