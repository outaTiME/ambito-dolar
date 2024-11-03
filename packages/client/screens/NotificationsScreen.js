import AmbitoDolar from '@ambito-dolar/core';
import { compose } from '@reduxjs/toolkit';
import * as Device from 'expo-device';
import * as Linking from 'expo-linking';
import React from 'react';
import Collapsible from 'react-native-collapsible';
import { useSelector, useDispatch } from 'react-redux';

import * as actions from '../actions';
import ActionButton from '../components/ActionButton';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import ContentView from '../components/ContentView';
import FixedScrollView from '../components/FixedScrollView';
import MessageView from '../components/MessageView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const NotificationsScreen = ({ headerHeight, tabBarheight, navigation }) => {
  const dispatch = useDispatch();
  const notification_settings = useSelector(
    Helper.getNotificationSettingsSelector,
  );
  const onValueChange = React.useCallback(
    (value, type) => {
      const settings = Helper.getNotificationSettings(
        notification_settings,
        value,
        type,
      );
      dispatch(actions.updateNotificationSettings(settings));
    },
    [notification_settings],
  );
  const getItemView = React.useCallback(
    (type) => (
      <CardView key={type} note={I18n.t(`notification_${type}_note`)} plain>
        <CardItemView
          title={AmbitoDolar.getNotificationTitle(type)}
          // titleDetail={I18n.t(`notification_${type}_note`)}
          value={notification_settings[type].enabled}
          onValueChange={(value) => {
            onValueChange(value, type);
          }}
          customization
          onAction={() => {
            navigation.navigate('AdvancedNotifications', {
              type,
            });
          }}
        />
      </CardView>
    ),
    [notification_settings],
  );
  const [allowNotifications] = Helper.useSharedState('allowNotifications');
  return (
    <>
      {Device.isDevice && !allowNotifications ? (
        <ContentView>
          <MessageView
            style={{
              marginBottom: Settings.PADDING,
            }}
            message={I18n.t('allow_permissions')}
          />
          <ActionButton
            handleOnPress={Linking.openSettings}
            title={I18n.t('allow')}
            // alternativeBackground
          />
        </ContentView>
      ) : (
        <FixedScrollView
          {...{
            headerHeight,
            tabBarheight,
          }}
        >
          <CardView plain>
            <CardItemView
              title={I18n.t('allow_notifications')}
              value={notification_settings.enabled}
              onValueChange={(value) => {
                onValueChange(value);
              }}
            />
          </CardView>
          <Collapsible
            duration={Settings.ANIMATION_DURATION}
            collapsed={notification_settings.enabled !== true}
          >
            {[
              AmbitoDolar.NOTIFICATION_OPEN_TYPE,
              AmbitoDolar.NOTIFICATION_CLOSE_TYPE,
              AmbitoDolar.NOTIFICATION_VARIATION_TYPE,
            ].map((type) => getItemView(type))}
          </Collapsible>
        </FixedScrollView>
      )}
    </>
  );
};

export default compose(withContainer)(NotificationsScreen);
