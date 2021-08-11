import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import React from 'react';
import { Linking, Share } from 'react-native';
import { useSelector } from 'react-redux';
import { compose } from 'redux';

import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import ScrollView from '../components/ScrollView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const SettingsScreen = ({ navigation }) => {
  const processedAt = useSelector((state) => state.rates.processed_at);
  const onPressContact = React.useCallback(() => {
    MailComposer.composeAsync({
      recipients: [`soporte@${Settings.APP_DOMAIN}`],
      subject: `${Settings.APP_NAME} ${Settings.APP_VERSION}`,
      body: [
        '',
        '',
        '—',
        '',
        `${I18n.t('app_version')}: ${
          Settings.APP_REVISION_ID || Settings.APP_VERSION
        }`,
        `${I18n.t('device')}: ${Device.modelName} (${Device.osVersion})`,
      ].join('\n'),
    });
  }, []);
  const onPressReview = React.useCallback(() => {
    Linking.openURL(Settings.APP_REVIEW_URI);
  }, []);
  const onPressShare = React.useCallback(() => {
    Share.share({
      message: I18n.t('share_message', {
        appName: Settings.APP_NAME,
        websiteUrl: Settings.WEBSITE_URL,
      }),
    });
  }, []);
  const [contactAvailable] = Helper.useSharedState('contactAvailable', false);
  const [storeAvailable] = Helper.useSharedState('storeAvailable', false);
  const [tick, setTick] = React.useState();
  const processedAtFromNow = React.useMemo(
    () => DateUtils.get(processedAt).calendar(),
    [tick]
  );
  const tickCallback = React.useCallback(
    (tick) => {
      setTick(tick);
    },
    [processedAt]
  );
  Helper.useInterval(tickCallback);
  return (
    <ScrollView>
      <CardView
        title={I18n.t('opts_general')}
        note={I18n.t('opts_general_note', {
          lastUpdate: processedAtFromNow,
        })}
        plain
      >
        <CardItemView
          title={I18n.t('notifications')}
          // value="Si"
          useSwitch={false}
          onAction={() => {
            navigation.navigate('Notifications');
          }}
        />
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
    </ScrollView>
  );
};

export default compose(withContainer())(SettingsScreen);
