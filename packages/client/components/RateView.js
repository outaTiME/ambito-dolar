import AmbitoDolar from '@ambito-dolar/core';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
            marginRight: Settings.PADDING,
          },
        ]}
      >
        <Text style={[title_font]} numberOfLines={1}>
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

const InlineRateDetailView = ({ timestamp, change, stats, color, large }) => {
  const { theme, fonts } = Helper.useTheme();
  if (large) {
    return (
      <>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: Settings.PADDING / 2,
          }}
        >
          <Text
            style={[
              fonts.body,
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
              fonts.body,
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
        <View style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              marginTop: Settings.PADDING,
              flexDirection: 'row',
              marginBottom: -Settings.PADDING + Settings.CHART_STROKE_WIDTH,
              marginLeft: -(Settings.PADDING + Settings.CHART_STROKE_WIDTH),
              marginRight: -(Settings.PADDING + Settings.CHART_STROKE_WIDTH),
              ...StyleSheet.absoluteFillObject,
            }}
          >
            <MiniRateChartView {...{ stats, color }} />
          </View>
        </View>
      </>
    );
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Settings.PADDING / 2,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          marginRight: Settings.PADDING,
        }}
      >
        <Text
          style={[
            fonts.subhead,
            {
              color: Settings.getGrayColor(theme),
            },
          ]}
          numberOfLines={1}
        >
          {timestamp}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            height: 15, // sames as change font height
            width: 50,
            marginRight: Settings.PADDING,
          }}
        >
          <MiniRateChartView {...{ stats, color }} />
        </View>
        <Text
          style={[
            fonts.subhead,
            {
              color,
            },
          ]}
          numberOfLines={1}
        >
          {change}
        </Text>
      </View>
    </View>
  );
};

export default ({
  type,
  stats,
  onSelected,
  large = false,
  highlight = true,
}) => {
  const { theme } = Helper.useTheme();
  const [timestamp, value, change] = React.useMemo(
    () => stats[stats.length - 1],
    [stats]
  );
  const color = React.useMemo(
    () => Helper.getChangeColor(change, theme),
    [change, theme]
  );
  const value_fmt = React.useMemo(
    () => Helper.getInlineRateValue(value),
    [value]
  );
  const timestamp_fmt = React.useMemo(
    () => DateUtils.datetime(timestamp, { short: true }),
    [timestamp]
  );
  const change_fmt = React.useMemo(() => Helper.getChange(change), [change]);
  const onPress = React.useCallback(() => onSelected(type), [onSelected, type]);
  return (
    <CardView
      style={[
        { flex: 1 },
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
            large,
          }}
        />
        <InlineRateDetailView
          {...{
            timestamp: timestamp_fmt,
            change: change_fmt,
            stats,
            color,
            large,
          }}
        />
      </>
    </CardView>
  );
};
