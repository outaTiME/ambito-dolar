import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { View } from 'react-native';
import { useDispatch } from 'react-redux';

import * as actions from '../actions';
import ActionButton from '../components/ActionButton';
import MessageView from '../components/MessageView';
import RateView from '../components/RateView';
import withContainer from '../components/withContainer';
import withRates from '../components/withRates';
import withScreenshotShareSheet from '../components/withScreenshotShareSheet';
import I18n from '../config/I18n';
import Settings from '../config/settings';

const MainScreen = ({ navigation, rates, rateTypes, shoudStretch }) => {
  const dispatch = useDispatch();
  const onRateSelected = React.useCallback(
    (type) => {
      dispatch(actions.registerApplicationRateDetail());
      navigation.navigate('RateDetail', { type });
    },
    [dispatch],
  );
  const getItemView = React.useCallback(
    (type) => (
      <RateView
        {...{
          type,
          stats: rates[type].stats,
          onSelected: onRateSelected,
          shoudStretch,
        }}
        key={type}
      />
    ),
    [rates, shoudStretch],
  );
  if (rateTypes.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          // backgroundColor: 'red',
        }}
      >
        <MessageView
          style={{
            marginBottom: Settings.PADDING,
          }}
          message={I18n.t('no_selected_rates')}
        />
        <ActionButton
          handleOnPress={() => {
            navigation.navigate('Modals', {
              screen: 'CustomizeRates',
              params: {
                modal: true,
              },
              // https://reactnavigation.org/docs/nesting-navigators/#rendering-initial-route-defined-in-the-navigator
              // initial: false,
            });
            /* navigation.navigate('SettingsTab', {
              screen: 'CustomizeRates',
              // https://reactnavigation.org/docs/nesting-navigators/#rendering-initial-route-defined-in-the-navigator
              initial: false,
            }); */
          }}
          title={I18n.t('select_rates')}
          // alternativeBackground
        />
      </View>
    );
  }
  return <>{rateTypes.map((type) => getItemView(type))}</>;
};

export default compose(
  withContainer,
  withRates(true),
  withScreenshotShareSheet({
    actions: [I18n.t('edit')],
    handleContentChangeSize: true,
  }),
)(MainScreen);
