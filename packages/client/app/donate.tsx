// @ts-nocheck
import React from 'react';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import * as actions from '@/actions';
import ActionButton from '@/components/ActionButton';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import { useDonationProducts } from '@/hooks/useDonationProducts';
import {
  formatProductPrice,
  purchaseDonation,
  showPurchaseErrorAlert,
} from '@/utilities/Donation';
import Helper from '@/utilities/Helper';
import { goBack } from '@/utilities/Navigation';

const DonateScreen = () => {
  const dispatch = useDispatch();
  // force light
  const colorScheme = 'light';
  const { fonts } = Helper.useTheme(colorScheme);
  const safeAreaInsets = useSafeAreaInsets();
  const { products } = useDonationProducts();
  const [slug] = Helper.useSharedState('donationSlug');
  const [appDonationModal, setAppDonationModal] = Helper.useSharedState(
    'appDonationModal',
    false,
  );
  const [loadingProductId, setLoadingProductId] = React.useState(null);
  // ref so unmount cleanup reads the latest value
  const forcedRef = React.useRef(appDonationModal);
  forcedRef.current = appDonationModal;
  // skip ignore dispatch on unmount when user already donated
  const donatedRef = React.useRef(false);
  // mirrors loadingProductId so unmount cleanup sees the latest value
  const loadingRef = React.useRef(false);
  React.useEffect(() => {
    return () => {
      // purchase in flight resolves on its own, skip ignore dispatch
      if (donatedRef.current || loadingRef.current) {
        return;
      }
      if (forcedRef.current) {
        setAppDonationModal(false);
      } else {
        dispatch(actions.ignoreApplicationDonation());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleDonate = React.useCallback(
    async (product, productId) => {
      setLoadingProductId(productId);
      loadingRef.current = true;
      try {
        await purchaseDonation(product);
        donatedRef.current = true;
        dispatch(actions.registerApplicationDonation());
        // prevent parent effect from reopening after register reset
        if (forcedRef.current) {
          setAppDonationModal(false);
        }
        goBack();
      } catch (e) {
        showPurchaseErrorAlert(e);
      } finally {
        setLoadingProductId(null);
        loadingRef.current = false;
      }
    },
    [dispatch, setAppDonationModal],
  );
  // mirror bottom inset on top plus breathing room
  // iOS sheet absorbs the bottom inset, android does not so paddingBottom keeps it
  const isAndroid = Platform.OS === 'android';
  const verticalPadding = safeAreaInsets.bottom || Settings.PADDING * 2;
  const extra = Settings.PADDING;
  const paddingBottom = isAndroid
    ? verticalPadding + extra
    : verticalPadding - safeAreaInsets.bottom + extra;
  return (
    <View
      style={{
        backgroundColor: Settings.getContentColor(colorScheme),
        paddingTop: verticalPadding + extra,
        paddingHorizontal: Settings.PADDING * 2,
        paddingBottom,
        alignItems: 'center',
        // android formSheet lacks native top corner radius
        ...(isAndroid && {
          borderTopLeftRadius: Settings.BORDER_RADIUS * 2,
          borderTopRightRadius: Settings.BORDER_RADIUS * 2,
        }),
      }}
    >
      <Text
        style={[
          fonts.extraLargeTitle,
          { paddingHorizontal: Settings.PADDING / 2 },
        ]}
      >
        🥰
      </Text>
      <Text
        style={[
          fonts.body,
          {
            textAlign: 'center',
            paddingVertical: Settings.PADDING * 2,
          },
        ]}
      >
        {slug
          ? `${slug}\n\n${I18n.t('donate_modal_note')}`
          : I18n.t('donate_modal_note')}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: Settings.PADDING,
        }}
      >
        {products.map((product, index) => {
          const productId = product?.identifier ?? `product_${index}`;
          return (
            <ActionButton
              key={productId}
              title={formatProductPrice(product)}
              handleOnPress={
                loadingProductId === null
                  ? () => handleDonate(product, productId)
                  : undefined
              }
              alternativeBackground
              loading={loadingProductId === productId}
            />
          );
        })}
      </View>
      <ActionButton
        borderless
        title={I18n.t('not_now')}
        handleOnPress={loadingProductId === null ? goBack : undefined}
        colorScheme
        style={{ marginTop: Settings.PADDING * 2 }}
      />
    </View>
  );
};

export default DonateScreen;
