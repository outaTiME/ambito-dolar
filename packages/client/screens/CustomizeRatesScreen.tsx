// @ts-nocheck
import AmbitoDolar from '@ambito-dolar/core';
import { compose } from '@reduxjs/toolkit';
import * as Haptics from 'expo-haptics';
import * as _ from 'lodash';
import React from 'react';
import { Platform } from 'react-native';
import Animated, {
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sortable, { useItemContext } from 'react-native-sortables';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';

import * as actions from '@/actions';
import CardItemView from '@/components/CardItemView';
import CardView, { Separator } from '@/components/CardView';
import ContentView from '@/components/ContentView';
import { HeaderComponent, FooterComponent } from '@/components/FixedFlatList';
import FixedScrollView from '@/components/FixedScrollView';
import withContainer from '@/components/withContainer';
import withRates from '@/components/withRates';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';
import { goToRateOrder } from '@/utilities/Navigation';

const GridItem = ({ id, isModal }) => {
  const included = useSelector(
    ({ application: { excluded_rates } }) => !excluded_rates?.includes(id),
  );
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
        marginHorizontal: Settings.CONTENT_MARGIN * 2,
      }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: Settings.getContentColor(theme, false, isModal),
            borderCurve: 'continuous',
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

const CustomizeRatesScreen = ({ isModal, rates }) => {
  const scrollableRef = useAnimatedRef();
  const insets = useSafeAreaInsets();
  const { rate_order, rate_types } = useSelector(
    ({ application: { rate_order, rate_types } }) => ({
      rate_order,
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
          isModal,
        }}
      />
    ),
    [isModal],
  );
  // pad scroll content on android modal because native stack lacks safe-area insets
  const contentContainerStyle =
    Platform.OS === 'android' && isModal
      ? { paddingBottom: insets.bottom }
      : undefined;
  return (
    <FixedScrollView
      ref={scrollableRef}
      contentContainerStyle={contentContainerStyle}
    >
      <CardView {...{ plain: true, isModal }}>
        <CardItemView
          title={I18n.t('rate_order')}
          useSwitch={false}
          value={Helper.getRateOrderString(rate_order)}
          onAction={() => {
            goToRateOrder(isModal);
          }}
          isModal={isModal}
        />
      </CardView>
      <HeaderComponent title={I18n.t('rate_order_and_display')} />
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
          title={I18n.t('reset')}
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
