import AmbitoDolar from '@ambito-dolar/core';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React from 'react';
import Collapsible from 'react-native-collapsible';
import { useSelector, useDispatch } from 'react-redux';
import { compose } from 'redux';

import * as actions from '../actions';
import ActionButton from '../components/ActionButton';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import MessageView from '../components/MessageView';
import ScrollView from '../components/ScrollView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const NotificationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const notification_settings = useSelector(
    Helper.getNotificationSettingsSelector
  );
  const onValueChange = React.useCallback(
    (value, type) => {
      const settings = Helper.getNotificationSettings(
        notification_settings,
        value,
        type
      );
      dispatch(actions.updateNotificationSettings(settings));
    },
    [notification_settings]
  );
  const getItemView = React.useCallback(
    (type) => (
      <CardItemView
        title={AmbitoDolar.getNotificationTitle(type)}
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
    ),
    [notification_settings]
  );
  const [allowNotifications] = Helper.useSharedState('allowNotifications');
  return (
    <>
      {Constants.isDevice && !allowNotifications ? (
        <>
          <MessageView
            style={[
              {
                marginBottom: Settings.PADDING * 2,
              },
            ]}
            message={I18n.t('allow_permissions')}
          />
          <ActionButton handleOnPress={Linking.openSettings} title="Permitir" />
        </>
      ) : (
        <ScrollView>
          <CardView plain>
            <CardItemView
              title="Notificaciones"
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
            <CardView
              note="Recibirás una notificación cuando abra la jornada cambiaria."
              plain
            >
              {getItemView(AmbitoDolar.NOTIFICATION_OPEN_TYPE)}
            </CardView>
            <CardView
              note="Recibirás una notificación cuando cierre la jornada cambiaria."
              plain
            >
              {getItemView(AmbitoDolar.NOTIFICATION_CLOSE_TYPE)}
            </CardView>
            <CardView
              note="Recibirás una notificación cuando exista una variación en alguna de las cotizaciones."
              plain
            >
              {getItemView(AmbitoDolar.NOTIFICATION_VARIATION_TYPE)}
            </CardView>
          </Collapsible>
        </ScrollView>
      )}
    </>
  );
};

export default compose(withContainer())(NotificationsScreen);
