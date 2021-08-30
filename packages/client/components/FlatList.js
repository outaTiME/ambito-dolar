import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useHeaderHeight } from '@react-navigation/elements';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  FlatList as NativeFlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Separator } from '../components/CardView';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const HEADER_HEIGHT = Settings.CARD_PADDING + Settings.PADDING * 2 + 20; // fonts.subhead (lineheight)
const SEPARATOR_HEIGHT = StyleSheet.hairlineWidth;

const HeaderComponent = ({ title }) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <View
      style={{
        padding: Settings.PADDING,
        marginTop: Settings.CARD_PADDING,
        marginHorizontal: Settings.CARD_PADDING * 2,
      }}
    >
      <Text
        style={[
          fonts.subhead,
          {
            color: Settings.getGrayColor(theme),
            textTransform: 'uppercase',
          },
        ]}
      >
        {title}
      </Text>
    </View>
  );
};

const FooterComponent = () => (
  <View
    style={{
      marginTop: Settings.CARD_PADDING * 2,
    }}
  />
);

export default ({ title, data, itemHeight }) => {
  const { theme } = Helper.useTheme();
  // add translucent hairline width
  const headerHeight = useHeaderHeight() - StyleSheet.hairlineWidth;
  const tabBarheight = useBottomTabBarHeight() - StyleSheet.hairlineWidth;
  const insets = useSafeAreaInsets();
  const renderItem = React.useCallback(
    ({ item, index }) => (
      <View
        style={[
          {
            backgroundColor: Settings.getContentColor(theme),
            marginHorizontal: Settings.CARD_PADDING * 2,
          },
          index === 0 && {
            borderTopLeftRadius: Settings.BORDER_RADIUS,
            borderTopRightRadius: Settings.BORDER_RADIUS,
          },
          index === data.length - 1 && {
            borderBottomLeftRadius: Settings.BORDER_RADIUS,
            borderBottomRightRadius: Settings.BORDER_RADIUS,
          },
        ]}
      >
        {item.component}
      </View>
    ),
    [theme, data]
  );
  const keyExtractor = React.useCallback((item) => item.id, []);
  const separatorComponent = React.useCallback(
    () => (
      <View
        style={{
          backgroundColor: Settings.getContentColor(theme),
          marginHorizontal: Settings.CARD_PADDING * 2,
        }}
      >
        <Separator />
      </View>
    ),
    [theme]
  );
  const headerComponent = React.useCallback(
    () => <HeaderComponent {...{ title }} />,
    [title]
  );
  const footerComponent = React.useCallback(() => <FooterComponent />, []);
  const itemLayout = React.useCallback(
    (data, index) => ({
      length: itemHeight,
      offset: HEADER_HEIGHT + (itemHeight + SEPARATOR_HEIGHT) * index,
      index,
    }),
    [itemHeight]
  );
  return (
    <NativeFlatList
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
      {...{ data }}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={separatorComponent}
      ListHeaderComponent={headerComponent}
      ListFooterComponent={footerComponent}
      getItemLayout={itemLayout}
      initialNumToRender={12}
    />
  );
};
