import { compose } from '@reduxjs/toolkit';
import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import React from 'react';
import { Linking, Share, Platform } from 'react-native';
import { useSelector, shallowEqual } from 'react-redux';

import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import FixedScrollView from '../components/FixedScrollView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const SettingsScreen = ({ navigation }) => {
  const { updatedAt, appearance } = useSelector(
    ({ rates: { updated_at: updatedAt }, application: { appearance } }) => ({
      updatedAt,
      appearance,
    }),
    shallowEqual
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
        `${I18n.t('installation')}: ${Settings.INSTALLATION_ID}`,
        `${I18n.t('app_version')}: ${
          Settings.APP_REVISION_ID || Settings.APP_VERSION
        }`,
        `${I18n.t('device')}: ${Device.modelName} (${Device.osVersion})`,
      ].join('\r\n'),
    }).catch(console.warn);
  }, []);
  const onPressReview = React.useCallback(() => {
    Linking.openURL(Settings.APP_REVIEW_URI).catch(console.warn);
  }, []);
  const onPressDonate = React.useCallback(() => {
    Linking.openURL(Settings.CAFECITO_URL).catch(console.warn);
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
  const updatedAtFromNow = React.useMemo(
    () => DateUtils.get(updatedAt).calendar(),
    [tick]
  );
  const tickCallback = React.useCallback(
    (tick) => {
      setTick(tick);
    },
    [updatedAt]
  );
  Helper.useInterval(tickCallback);
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
      <CardView title={I18n.t('opts_support')} plain>
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
        {Platform.OS === 'android' && (
          <CardItemView
            title={I18n.t('donate')}
            useSwitch={false}
            chevron={false}
            onAction={onPressDonate}
          />
        )}
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
    </FixedScrollView>
  );
};

export default compose(withContainer())(SettingsScreen);
