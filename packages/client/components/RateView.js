import AmbitoDolar from '@ambito-dolar/core';
import MaterialIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/MaterialIcons';
import React from 'react';
import { View, Text, Platform, PixelRatio } from 'react-native';

import CardView from '../components/CardView';
import MiniRateChartView from '../components/VictoryMiniRateChartView';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const InlineRateView = ({ type, value, onSelected, condensed }) => {
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
          {AmbitoDolar.getRateTitle(type)}
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
  condensed,
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
                (condensed === true || smallPadding ? 1 : 2),
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
        {/* required by chart */}
        <View
          style={{
            flex: 1,
            margin: -Settings.PADDING * (condensed === true ? 0.9 : 1),
            marginTop: 0,
          }}
        >
          <MiniRateChartView {...{ stats, color, borderless: true }} />
        </View>
      </>
    );
  }
  const changeWidth = Helper.roundToNearestEven(
    140 *
      Math.min(PixelRatio.getFontScale(), Settings.MAX_FONT_SIZE_MULTIPLIER),
  );
  const showMiniRateChart =
    changeWidth + Settings.CARD_PADDING * 2 + Settings.PADDING <=
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

export default ({
  type,
  stats,
  onSelected,
  large = false,
  highlight = true,
  condensed = false,
  shoudStretch = true,
  smallPadding = false,
}) => {
  const { theme } = Helper.useTheme();
  const [timestamp, value, change] = React.useMemo(
    () => stats[stats.length - 1],
    [stats],
  );
  const color = React.useMemo(
    () => Helper.getChangeColor(change, theme),
    [change, theme],
  );
  const value_fmt = React.useMemo(
    () => Helper.getInlineRateValue(value),
    [value],
  );
  const timestamp_fmt = React.useMemo(
    () => DateUtils.humanize(timestamp, 1),
    [timestamp],
  );
  const change_fmt = React.useMemo(
    () => AmbitoDolar.getRateChange(stats[stats.length - 1], true),
    [stats],
  );
  const onPress = React.useCallback(() => onSelected(type), [onSelected, type]);
  return (
    <CardView
      style={[
        shoudStretch === true && {
          flex: 1,
        },
        highlight === false && {
          opacity: 0.3,
        },
        // same as marginHorizontal from title
        Platform.OS === 'web' && {
          margin: Settings.CARD_PADDING * (condensed === true ? 0.9 : 1.5),
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
            type,
            value: value_fmt,
            onSelected,
            condensed,
          }}
        />
        <InlineRateDetailView
          {...{
            timestamp: timestamp_fmt,
            change: change_fmt,
            stats,
            color,
            large,
            condensed,
            smallPadding,
          }}
        />
      </>
    </CardView>
  );
};
