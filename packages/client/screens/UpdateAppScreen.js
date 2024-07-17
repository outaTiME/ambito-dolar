import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { Linking } from 'react-native';
import { useDispatch } from 'react-redux';

import * as actions from '../actions';
import ActionButton from '../components/ActionButton';
import ContentView from '../components/ContentView';
import MessageView from '../components/MessageView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const UpdateAppScreen = ({ navigation }) => {
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
        Helper.debug('You must confirm the current modal screen');
      }),
    [navigation, confirmed],
  );
  React.useEffect(() => {
    if (confirmed === true) {
      (async () => {
        await dispatch(actions.ignoreApplicationUpdate());
        // navigation.goBack();
      })();
    }
  }, [dispatch, confirmed]);
  const onPressUpdate = React.useCallback(() => {
    Linking.openURL(Settings.APP_STORE_URI).catch(console.warn);
  }, []);
  const [storeAvailable] = Helper.useSharedState('storeAvailable', false);
  return (
    <ContentView>
      <MessageView
        style={{
          marginBottom: Settings.PADDING,
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
        alternativeBackground
        // small={storeAvailable}
      />
    </ContentView>
  );
};

export default compose(withContainer(true))(UpdateAppScreen);
