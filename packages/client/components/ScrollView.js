import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { View, ScrollView as NativeScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';
import withDividersOverlay from './withDividersOverlay';

const ScrollView = ({
  children,
  backgroundColor,
  contentContainerRef,
  headerHeight,
  tabBarheight,
  containerRef,
  ...extra
}) => {
  const insets = useSafeAreaInsets();
  const indicatorStyle = Helper.useIndicatorStyle();
  return (
    <NativeScrollView
      scrollIndicatorInsets={{
        // top: headerHeight,
        bottom: tabBarheight - insets.bottom,
      }}
      indicatorStyle={indicatorStyle}
      contentContainerStyle={[
        {
          flexGrow: 1,
          alignSelf: 'center',
          width: Math.min(Settings.DEVICE_WIDTH, Settings.MAX_DEVICE_WIDTH),
          // required when translucent bars
          ...(Platform.OS === 'ios' && {
            paddingTop: headerHeight,
            paddingBottom: tabBarheight,
          }),
        },
      ]}
      style={
        {
          // backgroundColor: 'pink',
        }
      }
      // contentInsetAdjustmentBehavior="automatic"
      // https://snack.expo.dev/@wolewicki/ios-header-height
      /* contentInsetAdjustmentBehavior="automatic"
      scrollToOverflowEnabled
      scrollIndicatorInsets={{
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
            paddingBottom: tabBarheight - insets.bottom,
          }),
        },
      ]} */
      ref={containerRef}
      {...extra}
    >
      <View style={{ flex: 1, backgroundColor }} ref={contentContainerRef}>
        <View
          style={[
            {
              flex: 1,
              margin: Settings.CARD_PADDING,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </NativeScrollView>
  );
};

export default compose(withDividersOverlay)(ScrollView);
