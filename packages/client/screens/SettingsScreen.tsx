// @ts-nocheck
import { compose } from '@reduxjs/toolkit';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as MailComposer from 'expo-mail-composer';
import React from 'react';
import { Linking, Share } from 'react-native';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';

import * as actions from '@/actions';
import CardItemView from '@/components/CardItemView';
import CardView from '@/components/CardView';
import FixedScrollView from '@/components/FixedScrollView';
import TextCardView from '@/components/TextCardView';
import withContainer from '@/components/withContainer';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import { useDonationProducts } from '@/hooks/useDonationProducts';
import DateUtils from '@/utilities/Date';
import {
  formatProductPrice,
  purchaseDonation,
  showGenericErrorAlert,
  showPurchaseErrorAlert,
} from '@/utilities/Donation';
import Helper from '@/utilities/Helper';
import {
  goToAbout,
  goToAppearance,
  goToCustomizeRates,
  goToDeveloper,
  goToDonate,
  goToNotifications,
  goToStatistics,
} from '@/utilities/Navigation';

const SettingsScreen = () => {
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
  }, [installationId]);
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
  // tick state forces a re-render so the relative time string stays fresh
  const [, setTick] = React.useState(0);
  const tickCallback = React.useCallback(() => {
    setTick((value) => value + 1);
  }, []);
  Helper.useInterval(tickCallback);
  const updatedAtFromNow = DateUtils.get(updatedAt).calendar();
  const dispatch = useDispatch();
  const [purchasesConfigured] = Helper.useSharedState(
    'purchasesConfigured',
    false,
  );
  const { products: donationProducts, ensureProducts } = useDonationProducts();
  const [purchaseLoading, setPurchaseLoading] = React.useState(false);
  const purchaseLoadingRef = React.useRef(false);
  const onPressDonate = React.useCallback(async () => {
    if (purchaseLoadingRef.current) {
      return;
    }
    purchaseLoadingRef.current = true;
    setPurchaseLoading(true);
    try {
      const items = await ensureProducts();
      if (!items.length) {
        showGenericErrorAlert();
        return;
      }
      if (items.length > 1) {
        goToDonate();
        return;
      }
      try {
        await purchaseDonation(items[0]);
        dispatch(actions.registerApplicationDonation());
      } catch (e) {
        showPurchaseErrorAlert(e);
      }
    } finally {
      purchaseLoadingRef.current = false;
      setPurchaseLoading(false);
    }
  }, [ensureProducts, dispatch]);
  const handleIdentifierInteraction = React.useCallback(
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
    <FixedScrollView>
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
            goToNotifications();
          }}
        />
        <CardItemView
          title={I18n.t('appearance')}
          useSwitch={false}
          value={Helper.getAppearanceString(appearance)}
          onAction={() => {
            goToAppearance();
          }}
        />
        <CardItemView
          title={I18n.t('customize_rates')}
          useSwitch={false}
          onAction={() => {
            goToCustomizeRates();
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
            goToStatistics();
          }}
        />
        {__DEV__ && (
          <CardItemView
            title={I18n.t('developer')}
            useSwitch={false}
            onAction={() => {
              goToDeveloper();
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
            chevron={donationProducts?.length !== 1}
            onAction={onPressDonate}
            loading={purchaseLoading}
            {...(donationProducts?.length === 1 && {
              value: formatProductPrice(donationProducts[0]),
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
            goToAbout();
          }}
        />
      </CardView>
      {installationId && (
        <TextCardView
          text={`${I18n.t('installation_id')}: ${installationId}`}
          onLongPress={handleIdentifierInteraction}
        />
      )}
    </FixedScrollView>
  );
};

export default compose(withContainer)(SettingsScreen);
