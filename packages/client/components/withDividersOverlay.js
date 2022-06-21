import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { getDefaultHeaderHeight } from '@react-navigation/elements';
import { useTheme } from '@react-navigation/native';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import {
  useSafeAreaInsets,
  useSafeAreaFrame,
} from 'react-native-safe-area-context';

export default (Component) => (props) => {
  const insets = useSafeAreaInsets();
  // fails on iPad
  // const headerHeight = useHeaderHeight();
  const headerHeight = getDefaultHeaderHeight(
    useSafeAreaFrame(),
    false,
    insets.top
  );
  // const headerHeight = 50 + insets.top;
  const tabBarheight = useBottomTabBarHeight();
  const { colors } = useTheme();
  return (
    <>
      <Component
        {...props}
        {...{
          // add translucent hairline width
          headerHeight: headerHeight + StyleSheet.hairlineWidth,
          tabBarheight: tabBarheight + StyleSheet.hairlineWidth,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? headerHeight : 0,
          left: 0,
          right: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          // backgroundColor: 'red',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? tabBarheight : 0,
          left: 0,
          right: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          // backgroundColor: 'red',
        }}
      />
    </>
  );
};
