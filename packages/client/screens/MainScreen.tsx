// @ts-nocheck
import { compose } from '@reduxjs/toolkit';
import { Stack, useNavigation } from 'expo-router';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import * as actions from '@/actions';
import EmptyRatesView from '@/components/EmptyRatesView';
import FixedScrollView from '@/components/FixedScrollView';
import HeaderButton from '@/components/HeaderButton';
import RateView from '@/components/RateView';
import withContainer from '@/components/withContainer';
import withRates from '@/components/withRates';
import Settings from '@/config/settings';
import {
  goToRateDetail,
  goToCustomizeRatesModal,
} from '@/utilities/Navigation';

const MainScreen = ({ rates, rateTypes, backgroundColor }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const relativeDates = useSelector(
    (state: any) => state.application.use_relative_dates ?? true,
  );
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
      {rateTypes.length === 0 ? (
        <EmptyRatesView
          edges={{ top: true, bottom: true }}
          backgroundColor={backgroundColor}
        />
      ) : (
        <FixedScrollView
          key={rateTypes.length}
          backgroundColor={backgroundColor}
        >
          {rateTypes.map((type) => (
            <RateView
              key={type}
              type={type}
              stats={rates[type].stats}
              onSelected={onRateSelected}
              relativeDates={relativeDates}
            />
          ))}
        </FixedScrollView>
      )}
    </>
  );
};

export default compose(withContainer, withRates(true))(MainScreen);
