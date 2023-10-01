import AmbitoDolar from '@ambito-dolar/core';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { View, Text } from 'react-native';

import CardView from '../components/CardView';
import MiniRateChartView from '../components/VictoryMiniRateChartView';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const InlineRateView = ({ type, value, onSelected }) => {
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
              marginTop: Settings.SMALL_PADDING * (condensed === true ? 1 : 2),
              // borderColor: 'red',
              // borderWidth: 1,
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
            // marginTop: Settings.PADDING,
            // marginTop: Settings.SMALL_PADDING,
            // marginTop: Settings.SMALL_PADDING * 2,
            marginLeft: -Settings.PADDING,
            marginRight: -Settings.PADDING,
            marginBottom: -Settings.PADDING,
          }}
        >
          <MiniRateChartView {...{ stats, color, borderless: true }} />
        </View>
      </>
    );
  }
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
        // adjustsFontSizeToFit
        numberOfLines={1}
      >
        {timestamp}
      </Text>
      <View
        style={{
          height: 15, // sames as change font height
          width: 40,
          marginHorizontal: Settings.SMALL_PADDING * 2,
        }}
      >
        <MiniRateChartView {...{ stats, color }} />
      </View>
      <Text
        style={[
          fonts.subhead,
          {
            // FIXME: took width from container and center the chart
            width: 140,
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
          // TODO: remove when customization is allowed (review on web)
          flex: 1,
        },
        highlight === false && {
          opacity: 0.3,
        },
      ]}
      {...(onSelected && { onPress })}
    >
      <>
        <InlineRateView
          {...{
            type,
            value: value_fmt,
            onSelected,
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
          }}
        />
      </>
    </CardView>
  );
};
