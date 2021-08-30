import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useHeaderHeight } from '@react-navigation/elements';
import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { compose } from 'redux';

import RateView from '../components/RateView';
// import ScrollView from '../components/ScrollView';
import withContainer from '../components/withContainer';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const TodayHeaderComponent = ({ title, style }) => {
  const { theme, fonts } = Helper.useTheme();
  const processedAt = useSelector((state) => state.rates.processed_at);
  return (
    <View
      style={[
        {
          padding: Settings.CARD_PADDING * 2,
          backgroundColor: Settings.getBackgroundColor(theme),
          borderColor: 'red',
          // borderWidth: 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          fonts.subhead,
          {
            color: Settings.getGrayColor(theme),
            textTransform: 'uppercase',
          },
        ]}
      >
        {DateUtils.get(processedAt).format('LLL')}
      </Text>
    </View>
  );
};

const MainScreen = ({ navigation }) => {
  const onRateSelected = React.useCallback(
    (type) => navigation.navigate('RateDetail', { type }),
    []
  );
  const rates = useSelector((state) => state.rates.rates);
  const rateTypes = React.useMemo(() => Object.keys(rates), [rates]);
  const getItemView = React.useCallback(
    (type) => (
      <RateView
        {...{
          key: type,
          type,
          stats: rates[type].stats,
          onSelected: onRateSelected,
        }}
      />
    ),
    [rates]
  );
  const headerHeight = useHeaderHeight() - StyleSheet.hairlineWidth;
  const tabBarheight = useBottomTabBarHeight() - StyleSheet.hairlineWidth;
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      scrollIndicatorInsets={{
        top: headerHeight - insets.top,
        bottom: tabBarheight - insets.bottom,
      }}
      contentContainerStyle={[
        {
          flexGrow: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: Settings.MAX_DEVICE_WIDTH,
          // required when translucent bars
          ...(Platform.OS === 'ios' && {
            // paddingTop: headerHeight,
            paddingBottom: tabBarheight,
          }),
        },
      ]}
      stickyHeaderIndices={[0]}
    >
      <TodayHeaderComponent
        style={{
          ...(Platform.OS === 'ios' && {
            paddingTop: headerHeight,
          }),
        }}
      />
      <View
        style={[
          {
            flex: 1,
            margin: Settings.CARD_PADDING,
            marginTop: -Settings.CARD_PADDING,
          },
        ]}
      >
        {rateTypes.map((type) => getItemView(type))}
      </View>
    </ScrollView>
  );
};

export default compose(
  withContainer()
  // withScreenshotShareSheet('Compartir cotizaciones')
  // withScreenshotShareSheet
)(MainScreen);
