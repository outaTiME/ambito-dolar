import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTheme } from '@react-navigation/native';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

export default (Component) => (props) => {
  const headerHeight = useHeaderHeight();
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
        }}
      />
    </>
  );
};
