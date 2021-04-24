import * as React from 'react';
import {
  View,
  Text,
  ScrollView as NativeScrollView,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';

import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const WATERMARK_HEIGHT = 21;
const BOTTOM_MARGIN_FOR_WATERMARK =
  WATERMARK_HEIGHT + Settings.CARD_PADDING * 2;

export default ({
  children,
  backgroundColor,
  contentContainerRef,
  watermark = false,
  ...extra
}) => {
  const { theme, fonts } = Helper.useTheme();
  const processed_at = useSelector((state) => state.rates?.processed_at);
  return (
    <NativeScrollView
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
                ` ${Settings.DASH_SEPARATOR} ${DateUtils.datetime(
                  processed_at,
                  { short: true }
                )}`}
            </Text>
          </View>
        )}
      </View>
    </NativeScrollView>
  );
};
