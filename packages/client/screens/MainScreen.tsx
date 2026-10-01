// @ts-nocheck
import { Stack, useNavigation } from 'expo-router';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import * as actions from '@/actions';
import EmptyRatesView from '@/components/EmptyRatesView';
import FixedScrollView from '@/components/FixedScrollView';
import HeaderButton from '@/components/HeaderButton';
import RateView from '@/components/RateView';
import withContainer from '@/components/withContainer';
import { getKind } from '@/config/kinds';
import Settings from '@/config/settings';

// markets bring their own formats, rates keep the card defaults
const QuoteView = ({ kind, type, ...props }) => {
  const viewProps = React.useMemo(
    () => getKind(kind).getViewProps(type),
    [kind, type],
  );
  return (
    <RateView
      {...{ type, ...props, ...viewProps }}
      title={getKind(kind).getTitle(type)}
    />
  );
};

const MainScreen = ({ kind, backgroundColor }) => {
  const { useItems, goToCustomize } = getKind(kind);
  const rates = useItems(true);
  const rateTypes = React.useMemo(() => Object.keys(rates || {}), [rates]);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const relativeDates = useSelector(
    (state: any) => state.application.use_relative_dates ?? true,
  );
  const onRateSelected = React.useCallback(
    (type) => {
      dispatch(actions.registerApplicationRateDetail());
      getKind(kind).goToDetail(type);
    },
    [dispatch, kind],
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
          onPress={goToCustomize}
        />
      ),
    });
  }, [navigation, goToCustomize]);
  return (
    <>
      {Settings.IS_LIQUID_GLASS && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="line.3.horizontal.decrease"
            // icon="slider.horizontal.3"
            onPress={goToCustomize}
          />
        </Stack.Toolbar>
      )}
      {rateTypes.length === 0 ? (
        <EmptyRatesView
          edges={{ top: true, bottom: true }}
          backgroundColor={backgroundColor}
          onSelect={goToCustomize}
        />
      ) : (
        <FixedScrollView
          key={rateTypes.length}
          backgroundColor={backgroundColor}
        >
          {rateTypes.map((type) => (
            <QuoteView
              key={type}
              kind={kind}
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

export default withContainer(MainScreen);
