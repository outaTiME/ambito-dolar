import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
// import { useHeaderHeight } from 'react-native-screens/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DividerView from './DividerView';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default (Component) => (props) => {
  const isModal = props.isModal;
  const headerHeight = Helper.useHeaderHeight(isModal);
  // const headerHeight = 97 + StyleSheet.hairlineWidth * 2;
  const safeAreaInsets = useSafeAreaInsets();
  const tabBarheight = !isModal
    ? useBottomTabBarHeight()
    : Platform.OS === 'ios'
      ? Settings.IS_TABLET ||
        (Settings.IS_HANDSET && safeAreaInsets.bottom === 0)
        ? 0
        : safeAreaInsets.bottom + 15
      : safeAreaInsets.bottom;
  const dividerHeight = StyleSheet.hairlineWidth;
  return (
    <>
      <Component
        {...{
          ...props,
          // add translucent hairline width
          headerHeight: headerHeight + dividerHeight,
          tabBarheight: tabBarheight + (!isModal ? dividerHeight : 0),
        }}
      />
      <DividerView
        style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? headerHeight : 0,
          left: 0,
          right: 0,
        }}
        height={dividerHeight}
      />
      {!isModal && (
        <DividerView
          style={{
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? tabBarheight : 0,
            left: 0,
            right: 0,
          }}
          height={dividerHeight}
        />
      )}
    </>
  );
};
