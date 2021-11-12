import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useHeaderHeight } from '@react-navigation/elements';
import React from 'react';
import {
  View,
  ScrollView as NativeScrollView,
  Platform,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({
  children,
  backgroundColor,
  contentContainerRef,
  ...extra
}) => {
  const { theme } = Helper.useTheme();
  // add translucent hairline width
  const headerHeight = useHeaderHeight() - StyleSheet.hairlineWidth;
  const tabBarheight = useBottomTabBarHeight() - StyleSheet.hairlineWidth;
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);
  return (
    <NativeScrollView
      /* scrollIndicatorInsets={{
        top: headerHeight - insets.top,
        bottom: tabBarheight - insets.bottom,
      }} */
      contentContainerStyle={[
        {
          flexGrow: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: Settings.MAX_DEVICE_WIDTH,
          // required when translucent bars
          /* ...(Platform.OS === 'ios' && {
            paddingTop: headerHeight,
            paddingBottom: tabBarheight,
          }), */
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

      contentInset={{
        top: headerHeight,
        bottom: tabBarheight,
      }}
      /* contentOffset={{ x: 0, y: -(headerHeight * 2) }} */
      // contentInset={{ top: headerHeight }}
      contentOffset={{ y: -headerHeight }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            setTimeout(() => {
              setRefreshing(false);
            }, 1 * 1000);
          }}
          // ios
          // tintColor={Settings.getGrayColor(theme)}
          // tintColor={theme === 'dark' ? 'rgb(174,174,178)' : 'rgb(99,99,102)'}
          tintColor="rgb(199,199,204)"
          // android
          colors={[Settings.getForegroundColor(theme)]}
          progressBackgroundColor={Settings.getBackgroundColor(theme)}
          progressViewOffset={headerHeight}
        />
      }
      // contentInsetAdjustmentBehavior="automatic"
      // automaticallyAdjustContentInsets={false}
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
