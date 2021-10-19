import AmbitoDolar from '@ambito-dolar/core';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import React from 'react';
import { View, Text } from 'react-native';
import Collapsible from 'react-native-collapsible';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import Toast from 'react-native-root-toast';
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
  const { theme, fonts, invertedTheme } = Helper.useTheme();
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
    [notification_settings]
  );
  const [allowNotifications] = Helper.useSharedState('allowNotifications');
  const pushToken = useSelector((state) => state.application.push_token);
  const pushTokenId = pushToken && pushToken.replace(/(^.*\[|\].*$)/g, '');
  const alreadyShowingToastRef = React.useRef(false);
  const handleOnPress = React.useCallback(() => {
    if (alreadyShowingToastRef.current === false) {
      alreadyShowingToastRef.current = true;
      Haptics.selectionAsync();
      Toast.show(I18n.t('text_copied'), {
        // duration: Settings.ANIMATION_DURATION,
        // position: -(tabBarheight + Settings.CARD_PADDING),
        position: Toast.positions.CENTER,
        onHidden: () => {
          alreadyShowingToastRef.current = false;
        },
        opacity: 1,
        containerStyle: {
          paddingHorizontal: 10 * 2,
          // borderRadius: Settings.BORDER_RADIUS,
          backgroundColor: Settings.getBackgroundColor(invertedTheme, true),
        },
        // force white
        // textStyle: [Settings.getFontObject('dark', 'callout')],
        textStyle: [Settings.getFontObject(invertedTheme, 'callout')],
      });
      // FIXME: update with pushTokenId on next release
      Clipboard.setString(Constants.installationId);
    }
  }, [invertedTheme]);

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
          <ActionButton
            handleOnPress={Linking.openSettings}
            title={I18n.t('allow')}
          />
        </>
      ) : (
        <ScrollView>
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
          {pushTokenId && (
            <View
              style={[
                {
                  // flexShrink: 0,
                  // flexGrow: 1,
                  margin: Settings.CARD_PADDING,
                  paddingVertical: Settings.PADDING,
                },
                {
                  borderColor: 'red',
                  // borderWidth: 1,
                },
                {
                  alignItems: 'center',
                  // justifyContent: 'flex-end',
                  justifyContent: 'center',
                  paddingHorizontal: Settings.CARD_PADDING,
                },
              ]}
            >
              <TouchableWithoutFeedback
                onPress={handleOnPress}
                hitSlop={{
                  top: Settings.PADDING,
                  bottom: Settings.PADDING,
                  left: Settings.PADDING,
                  right: Settings.PADDING,
                }}
              >
                <Text
                  style={[
                    fonts.subhead,
                    {
                      color: Settings.getGrayColor(theme),
                      // textTransform: 'uppercase',
                      textAlign: 'center',
                    },
                  ]}
                >
                  {`${I18n.t('notification_id')}: ${pushTokenId}`}
                </Text>
              </TouchableWithoutFeedback>
            </View>
          )}
        </ScrollView>
      )}
    </>
  );
};

export default compose(withContainer())(NotificationsScreen);
