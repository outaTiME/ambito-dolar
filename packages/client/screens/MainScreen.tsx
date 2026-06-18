// @ts-nocheck
import { compose } from '@reduxjs/toolkit';
import { Stack, useNavigation } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useDispatch } from 'react-redux';

import * as actions from '@/actions';
import ActionButton from '@/components/ActionButton';
import FixedScrollView from '@/components/FixedScrollView';
import HeaderButton from '@/components/HeaderButton';
import MessageView from '@/components/MessageView';
import RateView from '@/components/RateView';
import withContainer from '@/components/withContainer';
import withRates from '@/components/withRates';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import {
  goToRateDetail,
  goToCustomizeRatesModal,
} from '@/utilities/Navigation';

const MainScreen = ({ rates, rateTypes, backgroundColor }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const onRateSelected = React.useCallback(
    (type) => {
      dispatch(actions.registerApplicationRateDetail());
      goToRateDetail(type);
    },
    [dispatch],
  );
  // non-LG header right (Material on android, pre-iOS 26 fallback)
  React.useLayoutEffect(() => {
    if (Settings.IS_LIQUID_GLASS) {
      return;
    }
    navigation.setOptions({
      headerRight: () => (
        <HeaderButton.Icon
          iconName="filter-list"
          // iconName="tune"
          onPress={goToCustomizeRatesModal}
        />
      ),
    });
  }, [navigation]);
  const content =
    rateTypes.length === 0 ? (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
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
            goToCustomizeRatesModal();
          }}
          title={I18n.t('select_rates')}
        />
      </View>
    ) : (
      rateTypes.map((type) => (
        <RateView
          key={type}
          type={type}
          stats={rates[type].stats}
          onSelected={onRateSelected}
        />
      ))
    );
  return (
    <>
      {Settings.IS_LIQUID_GLASS && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="line.3.horizontal.decrease"
            // icon="slider.horizontal.3"
            onPress={goToCustomizeRatesModal}
          />
        </Stack.Toolbar>
      )}
      <FixedScrollView key={rateTypes.length} backgroundColor={backgroundColor}>
        {content}
      </FixedScrollView>
    </>
  );
};

export default compose(withContainer, withRates(true))(MainScreen);
