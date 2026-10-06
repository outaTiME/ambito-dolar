// @ts-nocheck
import { compose } from '@reduxjs/toolkit';

import CardItemView from '@/components/CardItemView';
import CardView from '@/components/CardView';
import FixedScrollView from '@/components/FixedScrollView';
import MessageView from '@/components/MessageView';
import withContainer from '@/components/withContainer';
import I18n from '@/config/I18n';
import {
  formatProductPrice,
  useDonationProducts,
} from '@/hooks/useDonationProducts';
import { useDonationPurchase } from '@/hooks/useDonationPurchase';

// fall back to store-provided title when i18n key missing
const getLocalTitle = (product) => {
  const key = `donate_product_${product.identifier}`;
  const localized = I18n.t(key, { defaultValue: '' });
  return localized || product.title;
};

const DonateScreen = () => {
  const { products } = useDonationProducts();
  const { loadingProductId, donate: handleDonate } = useDonationPurchase();
  return (
    <FixedScrollView>
      {products.length === 0 ? (
        <MessageView message={I18n.t('donate_unavailable')} />
      ) : (
        <CardView
          title={I18n.t('donate_choose_title')}
          note={I18n.t('donate_choose_note')}
          plain
        >
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
