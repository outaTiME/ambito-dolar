import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ContentView from './ContentView';
import ScrollView from './ScrollView';

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
      containerRef={containerRef}
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
};

export default FixedScrollView;
