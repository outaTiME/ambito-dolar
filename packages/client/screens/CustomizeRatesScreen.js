import AmbitoDolar from '@ambito-dolar/core';
import { useLayout } from '@react-native-community/hooks';
import { compose } from '@reduxjs/toolkit';
import * as Haptics from 'expo-haptics';
import * as _ from 'lodash';
import React from 'react';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import ContentView from '../components/ContentView';
import FixedFlatList from '../components/FixedFlatList';
import withContainer from '../components/withContainer';
import withDividersOverlay from '../components/withDividersOverlay';
import withRates from '../components/withRates';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

// fonts.body (lineheight)
const ITEM_HEIGHT = Settings.PADDING * 2 + 22;

const CustomizeRatesScreen = ({
  navigation,
  isModal,
  headerHeight,
  tabBarheight,
  rates,
}) => {
  const { rate_order, excluded_rates, rate_types } = useSelector(
    ({ application: { rate_order, excluded_rates, rate_types } }) => ({
      rate_order,
      excluded_rates,
      rate_types,
    }),
    shallowEqual,
  );
  const dispatch = useDispatch();
  const rateTypes = React.useMemo(
    () =>
      _.intersection(
        // use rates when nullish rate_types
        rate_types ?? Object.keys(rates),
        Object.keys(rates),
      ),
    [rates, rate_types],
  );
  const data = React.useMemo(
    () =>
      rateTypes.map((type, _index) => ({
        type,
        component: ({ drag, isActive, isModal }) => {
          const included = !excluded_rates?.includes(type);
          return (
            <CardItemView
              {...{
                title: AmbitoDolar.getRateTitle(type),
                value: included,
                onValueChange: (value) => {
                  dispatch(actions.excludeRate(type, value));
                },
                chevron: false,
                drag,
                isActive,
                isModal,
              }}
            />
          );
        },
      })),
    [rateTypes, excluded_rates],
  );
  const { onLayout, width: screenWidth } = useLayout();
  const dragHitSlop = React.useMemo(
    () => ({
      left: -(
        (screenWidth - Settings.CONTENT_WIDTH) / 2 +
        Settings.CARD_PADDING * 2
      ),
      width: Settings.PADDING + Settings.ICON_SIZE + Settings.PADDING,
    }),
    [screenWidth],
  );
  return (
    <>
      <FixedFlatList
        {...{
          draggable: true,
          data,
          itemHeight: ITEM_HEIGHT,
          headerHeight,
          tabBarheight,
          note: I18n.t('customize_rates_note'),
          title: 'Orden y visualización',
          ListHeaderComponent: (
            <ContentView
              contentContainerStyle={{ marginBottom: -Settings.CARD_PADDING }}
            >
              <CardView {...{ plain: true, isModal }}>
                <CardItemView
                  title="Orden"
                  useSwitch={false}
                  value={Helper.getRateOrderString(rate_order)}
                  onAction={() => {
                    navigation.navigate('RateOrder', {
                      modal: isModal,
                    });
                  }}
                  isModal={isModal}
                />
              </CardView>
            </ContentView>
          ),
          ListFooterComponent: (
            <ContentView
              contentContainerStyle={{ marginTop: -Settings.CARD_PADDING }}
            >
              <CardView {...{ plain: true, isModal }}>
                <CardItemView
                  title="Restablecer"
                  useSwitch={false}
                  chevron={false}
                  onAction={() => {
                    dispatch(actions.restoreCustomization());
                  }}
                />
              </CardView>
            </ContentView>
          ),
          isModal,
          onLayout,
          // react-native-draggable-flatlist
          keyExtractor: (item) => item.type,
          onDragEnd: ({ data }) => {
            const customRateTypes = _.map(data, 'type');
            // force manual order on update
            if (!_.isEqual(rateTypes, customRateTypes)) {
              dispatch(actions.changeRateOrder('custom'));
              dispatch(actions.changeRateOrderDirection(null));
              dispatch(actions.updateRateTypes(customRateTypes));
            }
          },
          ...(Settings.HAPTICS_ENABLED && {
            onDragBegin: Haptics.selectionAsync,
            onRelease: Haptics.selectionAsync,
            onPlaceholderIndexChange: Haptics.selectionAsync,
          }),
          dragHitSlop,
        }}
      />
    </>
  );
};

export default compose(
  withContainer(),
  withDividersOverlay,
  withRates(),
)(CustomizeRatesScreen);
