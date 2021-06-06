import React from 'react';
import { useDispatch } from 'react-redux';
import { compose } from 'redux';

import * as actions from '../actions';
import ActionButton from '../components/ActionButton';
import MessageView from '../components/MessageView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';

const UpdateAppModalScreen = ({ route: { params }, navigation }) => {
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
  return (
    <>
      <MessageView
        style={{
          marginBottom: Settings.PADDING * 2,
        }}
        message={I18n.t('update_app')}
      />
      <ActionButton
        title={I18n.t('remind_me_later')}
        handleOnPress={() => {
          setConfirmed(true);
        }}
      />
    </>
  );
};

export default compose(withContainer)(UpdateAppModalScreen);
