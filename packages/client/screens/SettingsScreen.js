import { useFocusEffect } from '@react-navigation/native';
import { compose } from '@reduxjs/toolkit';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as MailComposer from 'expo-mail-composer';
import React from 'react';
import { Linking, Share, Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import FixedScrollView from '../components/FixedScrollView';
import TextCardView from '../components/TextCardView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';
import Sentry from '../utilities/Sentry';

const SettingsScreen = ({ headerHeight, tabBarheight, navigation }) => {
  const { updatedAt, pushToken, appearance, showUpdateToast, installationId } =
    useSelector(
      ({
        rates: { updated_at: updatedAt },
        application: {
          push_token: pushToken,
          appearance,
          show_update_toast: showUpdateToast,
          installation_id: installationId,
        },
      }) => ({
        updatedAt,
        pushToken,
        appearance,
        showUpdateToast,
        installationId,
      }),
      shallowEqual,
    );
  const onPressContact = React.useCallback(() => {
    MailComposer.composeAsync({
      recipients: [`soporte@${Settings.APP_DOMAIN}`],
      subject: `${Settings.APP_NAME} ${Settings.APP_VERSION}`,
      body: [
        '',
        '',
        '—',
        '',
        `${I18n.t('installation_id')}: ${installationId}`,
      ].join('\r\n'),
    }).catch(console.warn);
  }, []);
  const onPressReview = React.useCallback(() => {
    Linking.openURL(Settings.APP_REVIEW_URI).catch(console.warn);
  }, []);
  const onPressShare = React.useCallback(() => {
    Share.share({
      message: I18n.t('share_message', {
        appName: Settings.APP_NAME,
        websiteUrl: Settings.WEBSITE_URL,
      }),
    }).catch(console.warn);
  }, []);
  const [contactAvailable] = Helper.useSharedState('contactAvailable', false);
  const [storeAvailable] = Helper.useSharedState('storeAvailable', false);
  const [tick, setTick] = React.useState();
  const updatedAtFromNow = React.useMemo(() => {
    const lastUpdate = DateUtils.get(updatedAt);
    /* if (DateUtils.get().isSame(lastUpdate, 'day')) {
      return lastUpdate.fromNow();
    } */
    return lastUpdate.calendar();
  }, [tick]);
  const tickCallback = React.useCallback(
    (tick) => {
      setTick(tick);
    },
    [updatedAt],
  );
  Helper.useInterval(tickCallback);
  const dispatch = useDispatch();
  // donate
  const getPurchaseProduct = React.useCallback(
    () =>
      Helper.timeout(
        Purchases.getProducts(
          ['small_contribution'],
          Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
        ),
      )
        .then((products) => products?.[0])
        .catch(console.warn),
    [],
  );
  const [purchaseProduct, setPurchaseProduct] = React.useState();
  React.useEffect(() => {
    if (__DEV__ && purchaseProduct) {
      console.log('🎟️ Product to donate updated', purchaseProduct);
    }
  }, [purchaseProduct]);
  useFocusEffect(
    React.useCallback(() => {
      // initial product fetch
      if (!purchaseProduct) {
        getPurchaseProduct().then((product) => {
          if (product) {
            setPurchaseProduct(product);
          }
        });
      }
    }, [purchaseProduct]),
  );
  const [donateLoading, setDonateLoading] = React.useState(false);
  const onPressDonate = React.useCallback(() => {
    setDonateLoading(true);
    Promise.resolve(purchaseProduct)
      .then((product) => product ?? getPurchaseProduct())
      .then((product) => {
        if (product) {
          // force an update in case the product changes
          setPurchaseProduct(product);
          return Purchases.purchaseStoreProduct(product);
        }
        throw new Error('No products available');
      })
      .catch((e) => {
        // silent ignore on user cancellation
        if (!e.userCancelled) {
          Sentry.captureException(new Error('Purchase error', { cause: e }));
          Alert.alert(
            I18n.t('generic_error'),
            '',
            [
              {
                text: I18n.t('accept'),
                onPress: () => {
                  // pass
                },
              },
            ],
            {
              cancelable: false,
            },
          );
        }
      })
      .finally(() => {
        setDonateLoading(false);
      });
  }, [purchaseProduct]);
  const [purchasesConfigured] = Helper.useSharedState('purchasesConfigured');
  const onDoubleTapIdentifier = React.useCallback(
    () =>
      Clipboard.setStringAsync(
        [installationId].concat(pushToken ?? []).join(),
      ).then((status) => {
        if (status === true) {
          return Haptics.notificationAsync();
        }
      }),
    [installationId, pushToken],
  );
  return (
    <FixedScrollView
      {...{
        headerHeight,
        tabBarheight,
      }}
    >
      <CardView
        title={I18n.t('opts_general')}
        note={I18n.t('opts_general_note', {
          lastUpdate: updatedAtFromNow,
        })}
        plain
      >
        <CardItemView
          title={I18n.t('notifications')}
          useSwitch={false}
          onAction={() => {
            navigation.navigate('Notifications');
          }}
        />
        <CardItemView
          title={I18n.t('appearance')}
          useSwitch={false}
          value={Helper.getAppearanceString(appearance)}
          onAction={() => {
            navigation.navigate('Appearance');
          }}
        />
        <CardItemView
          title={I18n.t('customize_rates')}
          useSwitch={false}
          onAction={() => {
            navigation.navigate('CustomizeRates', {
              modal: false,
            });
          }}
        />
        <CardItemView
          title={I18n.t('show_toast')}
          value={showUpdateToast}
          onValueChange={(value) => {
            dispatch(actions.showUpdateToast(value));
          }}
        />
      </CardView>
      <CardView plain>
        <CardItemView
          title={I18n.t('statistics')}
          useSwitch={false}
          onAction={() => {
            navigation.navigate('Statistics');
          }}
        />
        {__DEV__ && (
          <CardItemView
            title={I18n.t('developer')}
            useSwitch={false}
            onAction={() => {
              navigation.navigate('Developer');
            }}
          />
        )}
      </CardView>
      <CardView
        title={I18n.t('opts_support')}
        plain
        note={I18n.t('opts_support_note')}
      >
        {purchasesConfigured && (
          <CardItemView
            title={I18n.t('donate')}
            useSwitch={false}
            chevron={false}
            onAction={onPressDonate}
            loading={donateLoading}
            {...(purchaseProduct && {
              value: `${Helper.getCurrency(purchaseProduct.price, true, true)}`,
            })}
          />
        )}
        {contactAvailable && (
          <CardItemView
            title={I18n.t('send_app_feedback')}
            useSwitch={false}
            chevron={false}
            onAction={onPressContact}
          />
        )}
        {storeAvailable && (
          <CardItemView
            title={I18n.t('leave_app_review')}
            useSwitch={false}
            chevron={false}
            onAction={onPressReview}
          />
        )}
        <CardItemView
          title={I18n.t('share')}
          useSwitch={false}
          chevron={false}
          onAction={onPressShare}
        />
      </CardView>
      <CardView plain>
        <CardItemView
          title={I18n.t('about')}
          useSwitch={false}
          onAction={() => {
            navigation.navigate('About');
          }}
        />
      </CardView>
      {installationId && (
        <TextCardView
          text={`${I18n.t('installation_id')}: ${installationId}`}
          onDoubleTap={onDoubleTapIdentifier}
        />
      )}
    </FixedScrollView>
  );
};

export default compose(withContainer)(SettingsScreen);
