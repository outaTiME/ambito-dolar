// @ts-nocheck
import { useNavigation } from 'expo-router';
import * as _ from 'lodash';
import React from 'react';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-screens/experimental';
import { useDispatch, useSelector } from 'react-redux';

import * as actions from '@/actions';
import ActionButton from '@/components/ActionButton';
import { COLUMN_STYLE } from '@/components/ContentView';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import {
  formatProductPrice,
  useDonationProducts,
} from '@/hooks/useDonationProducts';
import { useDonationPurchase } from '@/hooks/useDonationPurchase';
import Helper from '@/utilities/Helper';
import { goBack } from '@/utilities/Navigation';

const DONATION_PURCHASE_SLUGS = [
  '¡Wow, usás {APP_NAME} un montón!',
  '¡Increíble lo fiel que sos a {APP_NAME}!',
  '¡Wow, no parás de entrar a {APP_NAME}!',
  '¡{APP_NAME} ya es parte de tu rutina diaria!',
  '¡Siempre con {APP_NAME} a mano!',
  '¡Sos inseparable de {APP_NAME}!',
  '¡No pasás un día sin mirar {APP_NAME}!',
  '¡Wow, abrís {APP_NAME} a cada rato!',
  '¡No te despegás de {APP_NAME} ni un segundo!',
  '¡Wow, no hay descanso entre vos y {APP_NAME}!',
  '¡Ya sos usuario nivel experto de {APP_NAME}!',
  '¡No hay quien te gane usando {APP_NAME}!',
];

const DonateScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const colorScheme = 'light';
  const { fonts } = Helper.useTheme(colorScheme);
  const safeAreaInsets = useSafeAreaInsets();
  const { products } = useDonationProducts();
  const daysUsed = useSelector(({ application }) => application.days_used);
  // taken on mount, a usage day crossed while open keeps the text
  const [slug] = React.useState(() =>
    _.replace(
      DONATION_PURCHASE_SLUGS[daysUsed % DONATION_PURCHASE_SLUGS.length],
      '{APP_NAME}',
      Settings.APP_NAME,
    ),
  );
  const [appDonationModal, setAppDonationModal] = Helper.useSharedState(
    'appDonationModal',
    false,
  );
  // captured on mount, the trigger is spent right below
  const forcedRef = React.useRef(appDonationModal);
  // skip ignore dispatch on unmount when user already donated
  const donatedRef = React.useRef(false);
  const {
    loadingProductId,
    loadingRef,
    donate: handleDonate,
  } = useDonationPurchase(() => {
    donatedRef.current = true;
    // a sheet closed before the payment sheet showed must not pop another screen
    if (navigation.isFocused()) {
      goBack();
    }
  });
  // spend the trigger here, an unmount that never runs would leave it armed
  React.useEffect(() => {
    if (forcedRef.current) {
      setAppDonationModal(false);
    }
  }, [setAppDonationModal]);
  React.useEffect(() => {
    return () => {
      Helper.debug('💖 Donation dismissed', {
        forcedOpen: forcedRef.current,
        donated: donatedRef.current,
        loading: loadingRef.current,
      });
      // a purchase in flight or done, or a forced open, spends no cooldown
      if (!donatedRef.current && !loadingRef.current && !forcedRef.current) {
        dispatch(actions.ignoreApplicationDonation());
      }
    };
  }, []);
  const isAndroid = Platform.OS === 'android';
  return (
    <View
      // detached card at the column width, the android formSheet spans the window
      style={
        isAndroid && [
          COLUMN_STYLE,
          {
            paddingHorizontal: Settings.CONTENT_MARGIN * 2,
            paddingBottom: safeAreaInsets.bottom + Settings.CONTENT_MARGIN * 2,
          },
        ]
      }
    >
      <View
        style={{
          backgroundColor: Settings.getContentColor(colorScheme),
          alignItems: 'center',
          padding: Settings.PADDING * 2,
          ...(isAndroid
            ? { borderRadius: Settings.BORDER_RADIUS * 2 }
            : // the iphone sheet inset gives room, the ipad one is small or none, the duo open takes the iphone padding
              {
                paddingVertical: Platform.isPad
                  ? Settings.PADDING * 2
                  : Settings.PADDING,
              }),
        }}
      >
        {!isAndroid && (
          // the sheet adds its bottom inset below the content, the same on top keeps both ends even
          <SafeAreaView edges={{ bottom: true }} style={{ flex: 0 }} />
        )}
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
          {`${slug}\n\n${I18n.t('donate_modal_note')}`}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: Settings.PADDING,
          }}
        >
          {products.map((product) => (
            <ActionButton
              key={product.identifier}
              title={formatProductPrice(product)}
              handleOnPress={
                loadingProductId === null
                  ? () => handleDonate(product)
                  : undefined
              }
              alternativeBackground
              loading={loadingProductId === product.identifier}
              colorScheme={colorScheme}
            />
          ))}
        </View>
        <ActionButton
          borderless
          title={I18n.t('not_now')}
          handleOnPress={loadingProductId === null ? goBack : undefined}
          colorScheme={colorScheme}
          // the button padding below its text reads as extra bottom space
          style={{
            marginTop: Settings.PADDING * 2,
            marginBottom: -Settings.PADDING / 2,
          }}
        />
      </View>
    </View>
  );
};

export default DonateScreen;
