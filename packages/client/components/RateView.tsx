// @ts-nocheck
import AmbitoDolar from '@ambito-dolar/core';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import React from 'react';
import { View, Text, Platform, PixelRatio } from 'react-native';

import CardView from '@/components/CardView';
import MiniRateChartView from '@/components/VictoryMiniRateChartView';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

const InlineRateView = ({ title, value, onSelected, compact }) => {
  const { theme, fonts } = Helper.useTheme();
  const title_font = fonts.title;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
        },
      ]}
    >
      <View
        style={[
          {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: Settings.PADDING / 2,
          },
        ]}
      >
        <Text
          style={[
            title_font,
            {
              flexShrink: 1,
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {onSelected && (
          <View style={{ marginLeft: Settings.PADDING / 2 }}>
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={Settings.getStrokeColor(theme)}
              style={{
                height: 20, // same as title_font
              }}
            />
          </View>
        )}
      </View>
      <Text style={[title_font]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

const InlineRateDetailView = ({
  timestamp,
  change,
  stats,
  color,
  large,
  compact,
  smallPadding,
}) => {
  const { theme, fonts } = Helper.useTheme();
  if (large) {
    return (
      <>
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              marginTop:
                Settings.SMALL_PADDING *
                (compact != null || smallPadding ? 1 : 2),
            },
          ]}
        >
          <Text
            style={[
              fonts.callout,
              {
                color: Settings.getGrayColor(theme),
                flex: 1,
              },
            ]}
            numberOfLines={1}
          >
            {timestamp}
          </Text>
          <Text
            style={[
              fonts.callout,
              {
                color,
              },
            ]}
            numberOfLines={1}
          >
            {change}
          </Text>
        </View>
        {/* chart wrapper extends past card padding so the chart drawing area
            reaches the card edges (compensates the card containerStyle.padding) */}
        <View
          style={{
            flex: 1,
            margin: -Settings.PADDING * (compact != null ? 0.9 : 1),
            marginTop: 0,
          }}
        >
          {stats.length > 1 && (
            <MiniRateChartView
              {...{
                stats,
                color,
                borderless: true,
              }}
            />
          )}
        </View>
      </>
    );
  }
  const changeWidth = Helper.roundToNearestEven(
    140 *
      Math.min(PixelRatio.getFontScale(), Settings.MAX_FONT_SIZE_MULTIPLIER),
  );
  // a single stat draws no line
  const showMiniRateChart =
    stats.length > 1 &&
    changeWidth + Settings.CONTENT_MARGIN * 2 + Settings.PADDING <=
      Helper.roundToNearestEven(Settings.CONTENT_WIDTH / 2);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Settings.SMALL_PADDING,
      }}
    >
      <Text
        style={[
          fonts.subhead,
          {
            flex: 1,
            color: Settings.getGrayColor(theme),
          },
        ]}
        numberOfLines={1}
      >
        {timestamp}
      </Text>
      {showMiniRateChart && (
        <View
          style={{
            height: 15, // sames as change font height
            width: 40,
            marginHorizontal: Settings.SMALL_PADDING * 2,
          }}
        >
          <MiniRateChartView {...{ stats, color }} />
        </View>
      )}
      <Text
        style={[
          fonts.subhead,
          {
            ...(showMiniRateChart && {
              width: changeWidth,
            }),
            textAlign: 'right',
            color,
          },
        ]}
        ellipsizeMode="middle"
        numberOfLines={1}
      >
        {change}
      </Text>
    </View>
  );
};

const RateView = ({
  type,
  stats,
  onSelected,
  large = false,
  highlight = true,
  compact = null,
  smallPadding = false,
  relativeDates = false,
  // markets bring their own title, the formats and color sense come from the kind
  title = AmbitoDolar.getRateTitle(type),
  formatValue,
  formatChange,
  inverse,
  formatDate,
}) => {
  const { theme } = Helper.useTheme();
  const now = Helper.useNow();
  const [timestamp, value, change] = React.useMemo(
    () => stats[stats.length - 1],
    [stats],
  );
  const color = React.useMemo(
    () => Helper.getChangeColor(inverse ? -change : change, theme),
    [change, inverse, theme],
  );
  const value_fmt = React.useMemo(
    () => formatValue(value),
    [formatValue, value],
  );
  const timestamp_fmt = React.useMemo(
    () => formatDate(timestamp, relativeDates ? 'relative' : 'card'),
    [timestamp, now, relativeDates, formatDate],
  );
  const change_fmt = React.useMemo(
    () => formatChange(stats[stats.length - 1]),
    [formatChange, stats],
  );
  const onPress = React.useCallback(() => onSelected(type), [onSelected, type]);
  return (
    <CardView
      style={[
        Platform.OS === 'web' && {
          flex: 1,
        },
        highlight === false && {
          opacity: 0.3,
        },
        // same as marginHorizontal from title
        Platform.OS === 'web' && {
          margin: Settings.CONTENT_MARGIN * (compact ?? 1.5),
        },
      ]}
      {...(onSelected && { onPress })}
      {...(Platform.OS === 'web' && {
        containerStyle: {
          padding: Settings.CARD_PADDING + Settings.SMALL_PADDING,
        },
      })}
    >
      <>
        <InlineRateView
          {...{
            title,
            value: value_fmt,
            onSelected,
            compact,
          }}
        />
        <InlineRateDetailView
          {...{
            timestamp: timestamp_fmt,
            change: change_fmt,
            stats,
            color,
            large,
            compact,
            smallPadding,
          }}
        />
      </>
    </CardView>
  );
};

export default React.memo(RateView);
