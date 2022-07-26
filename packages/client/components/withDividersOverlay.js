import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useHeaderHeight } from '@react-navigation/elements';
import React from 'react';
import { StyleSheet, Platform } from 'react-native';

import DividerView from './DividerView';

export default (Component) => (props) => {
  const headerHeight = useHeaderHeight();
  const tabBarheight = useBottomTabBarHeight();
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
      <DividerView
        style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? headerHeight : 0,
          left: 0,
          right: 0,
        }}
      />
      <DividerView
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? tabBarheight : 0,
          left: 0,
          right: 0,
        }}
      />
    </>
  );
};
