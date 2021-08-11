import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useHeaderHeight } from '@react-navigation/stack';
import * as React from 'react';
import {
  View,
  ScrollView as NativeScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Settings from '../config/settings';

export default ({
  children,
  backgroundColor,
  contentContainerRef,
  ...extra
}) => {
  // add translucent hairline width
  const headerHeight = useHeaderHeight() - StyleSheet.hairlineWidth;
  const tabBarheight = useBottomTabBarHeight() - StyleSheet.hairlineWidth;
  const insets = useSafeAreaInsets();
  return (
    <NativeScrollView
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
            paddingTop: headerHeight,
            paddingBottom: tabBarheight,
          }),
        },
      ]}
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
