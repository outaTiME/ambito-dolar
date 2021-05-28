import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  FlatList as NativeFlatList,
} from 'react-native';
import { useSelector } from 'react-redux';

import { Separator } from '../components/CardView';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const WATERMARK_HEIGHT = 21;
const BOTTOM_MARGIN_FOR_WATERMARK =
  WATERMARK_HEIGHT + Settings.CARD_PADDING * 2;

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

const FooterComponent = ({ watermark }) => {
  const { theme, fonts } = Helper.useTheme();
  const processed_at = useSelector((state) => state.rates?.processed_at);
  return (
    <>
      <View
        style={{
          flexGrow: 1,
          marginTop: Settings.CARD_PADDING * 2,
        }}
      />
      {watermark && (
        <View
          style={[
            {
              flexDirection: 'row',
              height: WATERMARK_HEIGHT,
              marginHorizontal: Settings.CARD_PADDING,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: Settings.CARD_PADDING * 2,
            },
          ]}
        >
          <Text
            style={[
              fonts.subhead,
              {
                color: Settings.getGrayColor(theme),
                textTransform: 'uppercase',
              },
            ]}
            numberOfLines={1}
          >
            {Settings.APP_COPYRIGHT}
            {processed_at &&
              ` ${Settings.DASH_SEPARATOR} ${DateUtils.datetime(processed_at, {
                short: true,
              })}`}
          </Text>
        </View>
      )}
    </>
  );
};

export default ({ watermark = false, title, data, itemHeight }) => {
  const { theme } = Helper.useTheme();
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
  const footerComponent = React.useCallback(
    () => <FooterComponent {...{ watermark }} />,
    [watermark]
  );
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
      bounces
      showsVerticalScrollIndicator={Platform.OS === 'ios'}
      overScrollMode="never"
      style={[
        watermark && {
          marginBottom: -BOTTOM_MARGIN_FOR_WATERMARK,
        },
      ]}
      contentContainerStyle={[
        {
          flexGrow: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: Settings.MAX_DEVICE_WIDTH,
        },
      ]}
      scrollIndicatorInsets={{
        ...(watermark && { bottom: BOTTOM_MARGIN_FOR_WATERMARK }),
      }}
      {...{ data }}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={separatorComponent}
      ListHeaderComponent={headerComponent}
      ListFooterComponent={footerComponent}
      ListFooterComponentStyle={{ flexGrow: 1 }}
      getItemLayout={itemLayout}
      initialNumToRender={12}
    />
  );
};
