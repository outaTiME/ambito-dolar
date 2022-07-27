import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Settings from '../config/settings';
import ScrollView from './ScrollView';
import withDividersOverlay from './withDividersOverlay';

const FixedScrollView = ({
  children,
  backgroundColor,
  contentContainerRef,
  headerHeight,
  tabBarheight,
  containerRef,
  ...extra
}) => {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      scrollIndicatorInsets={{
        // top: headerHeight,
        bottom: tabBarheight - insets.bottom,
      }}
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
      containerRef={containerRef}
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
    </ScrollView>
  );
};

export default compose(withDividersOverlay)(FixedScrollView);
