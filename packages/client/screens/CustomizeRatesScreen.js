import AmbitoDolar from '@ambito-dolar/core';
import { compose } from '@reduxjs/toolkit';
import * as Haptics from 'expo-haptics';
import * as _ from 'lodash';
import React from 'react';
import Animated, {
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import Sortable, { useItemContext } from 'react-native-sortables';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView, { Separator } from '../components/CardView';
import ContentView from '../components/ContentView';
import { HeaderComponent, FooterComponent } from '../components/FixedFlatList';
import FixedScrollView from '../components/FixedScrollView';
import withContainer from '../components/withContainer';
import withRates from '../components/withRates';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const GridItem = ({ id, included, isModal }) => {
  const { theme } = Helper.useTheme();
  const dispatch = useDispatch();
  const { itemKey, isActive, indexToKey, keyToIndex } = useItemContext();
  const edgeInfo = useDerivedValue(() => {
    'worklet';
    const idx = keyToIndex.value[itemKey];
    const count = indexToKey.value.length;
    const isFirst = idx === 0;
    const isLast = idx === count - 1;
    return { isFirst, isLast };
  }, [itemKey]);
  const radiusStyle = useAnimatedStyle(() => {
    const R = Settings.BORDER_RADIUS;
    const first = edgeInfo.value.isFirst;
    const last = edgeInfo.value.isLast;
    return {
      borderTopLeftRadius: first ? R : 0,
      borderTopRightRadius: first ? R : 0,
      borderBottomLeftRadius: last ? R : 0,
      borderBottomRightRadius: last ? R : 0,
    };
  });
  const separatorContainerStyle = useAnimatedStyle(() => {
    const hidden = edgeInfo.value.isLast || isActive.value;
    return {
      opacity: hidden ? 0 : 1,
    };
  });
  return (
    <ContentView
      contentContainerStyle={{
        marginVertical: 0,
        marginHorizontal: Settings.CARD_PADDING * 2,
      }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: Settings.getContentColor(theme, false, isModal),
          },
          radiusStyle,
        ]}
      >
        <CardItemView
          title={AmbitoDolar.getRateTitle(id)}
          value={included}
          onValueChange={(value) => dispatch(actions.excludeRate(id, value))}
          chevron={false}
          draggable
          isModal={isModal}
        />
        <Animated.View style={separatorContainerStyle}>
          <Separator isModal={isModal} />
        </Animated.View>
      </Animated.View>
    </ContentView>
  );
};

const CustomizeRatesScreen = ({
  navigation,
  isModal,
  headerHeight,
  tabBarHeight,
  rates,
}) => {
  const scrollableRef = useAnimatedRef();
  const { rate_order, rate_display, excluded_rates, rate_types } = useSelector(
    ({
      application: { rate_order, rate_display, excluded_rates, rate_types },
    }) => ({
      rate_order,
      rate_display,
      excluded_rates,
      rate_types,
    }),
    shallowEqual,
  );
  const rateTypes = React.useMemo(
    () =>
      Object.keys(
        // use the same rendering logic of the main screen
        Helper.getSortedRates(
          rates,
          'custom',
          undefined,
          undefined,
          rate_types,
        ),
      ),
    [rates, rate_types],
  );
  const data = React.useMemo(
    () =>
      rateTypes.map((type) => ({
        id: type,
      })),
    [rateTypes],
  );
  const dispatch = useDispatch();
  const renderItem = React.useCallback(
    ({ item: { id } }) => (
      <GridItem
        {...{
          id,
          included: !excluded_rates?.includes(id),
          isModal,
        }}
      />
    ),
    [excluded_rates, isModal],
  );
  return (
    <FixedScrollView
      {...{
        headerHeight,
        tabBarHeight,
      }}
      ref={scrollableRef}
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
        {false && (
          <CardItemView
            title="Mostrar"
            useSwitch={false}
            value={Helper.getRateDisplayString(rate_display)}
            onAction={() => {
              navigation.navigate('RateDisplay', {
                modal: isModal,
              });
            }}
            isModal={isModal}
          />
        )}
      </CardView>
      <HeaderComponent title="Orden y visualización" />
      <Sortable.Grid
        activeItemScale={1}
        // activeItemScale={1.03}
        // inactiveItemOpacity={1}
        // activeItemShadowOpacity={0}
        autoScrollSpeed={0.5}
        data={data}
        dragActivationDelay={Settings.INTERACTION_DELAY}
        // dragActivationDelay={0}
        // activationAnimationDuration={Settings.ANIMATION_DURATION}
        // dropAnimationDuration={Settings.ANIMATION_DURATION}
        overDrag="vertical"
        renderItem={renderItem}
        scrollableRef={scrollableRef}
        customHandle
        onOrderChange={() => {
          Settings.HAPTICS_ENABLED && Haptics.selectionAsync();
        }}
        onDragEnd={({ data: newData }) => {
          const customRateTypes = _.map(newData, 'id');
          // force manual order on update
          if (!_.isEqual(rateTypes, customRateTypes)) {
            dispatch(actions.changeRateOrder('custom'));
            dispatch(actions.changeRateOrderDirection(null));
            dispatch(actions.updateRateTypes(customRateTypes));
          }
          Settings.HAPTICS_ENABLED &&
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onDragStart={() => {
          Settings.HAPTICS_ENABLED &&
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
      />
      <FooterComponent note={I18n.t('customize_rates_note')} />
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
    </FixedScrollView>
  );
};

export default compose(withContainer, withRates())(CustomizeRatesScreen);
