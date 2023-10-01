import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';

import * as actions from '../actions';
import ActionButton from '../components/ActionButton';
import { MaterialHeaderButtons } from '../components/HeaderButtons';
import MessageView from '../components/MessageView';
import RateView from '../components/RateView';
import withContainer from '../components/withContainer';
import withDividersOverlay from '../components/withDividersOverlay';
import withRates from '../components/withRates';
import withScreenshotShareSheet from '../components/withScreenshotShareSheet';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const RefreshingIndicator = () => {
  const { theme } = Helper.useTheme();
  return (
    <MaterialHeaderButtons>
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          // required native stack
          width: Settings.ICON_SIZE,
          height: Settings.ICON_SIZE,
          // borderWidth: 1,
          // borderColor: 'red',
          // same as MaterialHeaderButton
          marginHorizontal: Settings.CARD_PADDING * 2 - 16,
        }}
      >
        <ActivityIndicator
          animating
          color={Settings.getForegroundColor(theme)}
          size="small"
        />
      </View>
    </MaterialHeaderButtons>
  );
};

const MainScreen = ({
  navigation,
  headerHeight,
  tabBarheight,
  rates,
  rateTypes,
}) => {
  const [updatingRates] = Helper.useSharedState('updatingRates');
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft:
        updatingRates === true ? () => <RefreshingIndicator /> : undefined,
      // () => <RefreshingIndicator />,
    });
  }, [navigation, updatingRates]);
  const dispatch = useDispatch();
  const onRateSelected = React.useCallback(
    (type) => {
      dispatch(actions.registerApplicationRateDetail());
      navigation.navigate('RateDetail', { type });
    },
    [dispatch],
  );
  const shoudStretch = React.useMemo(
    () => Settings.shoudStretchRates(rateTypes, headerHeight, tabBarheight),
    [rateTypes, headerHeight, tabBarheight],
  );
  const getItemView = React.useCallback(
    (type) => (
      <RateView
        {...{
          key: type,
          type,
          stats: rates[type].stats,
          onSelected: onRateSelected,
          shoudStretch,
        }}
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
  withContainer(),
  withDividersOverlay,
  withRates(true),
  // withScreenshotShareSheet('Compartir cotizaciones')
  withScreenshotShareSheet([I18n.t('edit')]),
)(MainScreen);
