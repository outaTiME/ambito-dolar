import React from 'react';
import { Platform } from 'react-native';

import ContentView from './ContentView';
import ScrollView from './ScrollView';

const FixedScrollView = ({
  children,
  backgroundColor,
  contentContainerRef,
  headerHeight,
  tabBarheight,
  ...extra
}) => (
  <ScrollView
    // automaticallyAdjustContentInsets={false}
    scrollIndicatorInsets={{
      top: headerHeight,
      bottom: tabBarheight,
    }}
    automaticallyAdjustsScrollIndicatorInsets={false}
    contentContainerStyle={[
      {
        flexGrow: 1,
        // required when translucent bars
        ...(Platform.OS === 'ios' && {
          paddingTop: headerHeight,
          paddingBottom: tabBarheight,
        }),
      },
    ]}
    /* style={
        {
          backgroundColor: 'pink',
        }
      } */
    // contentInsetAdjustmentBehavior="automatic"
    // scrollToOverflowEnabled
    {...extra}
  >
    <ContentView
      style={{ flex: 1, backgroundColor }}
      contentContainerStyle={{ flex: 1 }}
      ref={contentContainerRef}
    >
      {children}
    </ContentView>
  </ScrollView>
);

export default FixedScrollView;
