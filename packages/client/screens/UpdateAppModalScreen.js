import React from 'react';
import { Image, Linking } from 'react-native';
import { useDispatch } from 'react-redux';
import { compose } from 'redux';

import * as actions from '../actions';
import AppIcon from '../assets/icon.png';
import ActionButton from '../components/ActionButton';
import MessageView from '../components/MessageView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const UpdateAppModalScreen = ({ navigation }) => {
  const [confirmed, setConfirmed] = React.useState(false);
  const dispatch = useDispatch();
  // https://reactnavigation.org/docs/preventing-going-back
  React.useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (confirmed === true) {
          return;
        }
        // prevent the leaving the screen
        e.preventDefault();
        if (__DEV__) {
          console.log('You must confirm the current modal screen');
        }
      }),
    [navigation, confirmed]
  );
  React.useEffect(() => {
    if (confirmed === true) {
      (async () => {
        await dispatch(actions.ignoreApplicationUpdate());
        navigation.goBack();
      })();
    }
  }, [confirmed]);
  const onPressUpdate = React.useCallback(() => {
    Linking.openURL(Settings.APP_STORE_URI);
  }, []);
  const [storeAvailable] = Helper.useSharedState('storeAvailable', false);
  return (
    <>
      {false && (
        <Image
          source={AppIcon}
          style={{
            width: 75,
            height: 75,
            alignSelf: 'center',
            marginBottom: Settings.PADDING * 2,
            borderRadius: Settings.BORDER_RADIUS,
          }}
        />
      )}
      <MessageView
        style={{
          marginBottom: Settings.PADDING * 2,
        }}
        message={I18n.t('update_app')}
      />
      {storeAvailable && (
        <ActionButton
          title={I18n.t('update')}
          handleOnPress={onPressUpdate}
          style={{
            marginBottom: Settings.PADDING,
          }}
          alternativeBackground
        />
      )}
      <ActionButton
        borderless={storeAvailable}
        title={I18n.t('remind_me_later')}
        handleOnPress={() => {
          setConfirmed(true);
        }}
      />
    </>
  );
};

export default compose(withContainer(true))(UpdateAppModalScreen);
