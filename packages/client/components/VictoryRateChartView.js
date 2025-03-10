import AmbitoDolar from '@ambito-dolar/core';
import { useLayout } from '@react-native-community/hooks';
import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { View, Text } from 'react-native';
import AnimateableText from 'react-native-animateable-text';
import {
  useDerivedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { clamp } from 'react-native-redash';
import {
  VictoryChart,
  VictoryArea,
  VictoryAxis,
  VictoryLabel,
} from 'victory-native';

import AnimatedChartView from './AnimatedChartView';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const AXIS_FONT_SIZE = 10;
const TICKS_X = Settings.MAX_NUMBER_OF_STATS;
const TICKS_Y = 5;
const AXIS_TICK_SIZE = 5;
const AXIS_LABEL_PADDING = Settings.PADDING - AXIS_TICK_SIZE;
const AXIS_OFFSET = AXIS_TICK_SIZE + AXIS_LABEL_PADDING;

const RateChartHeaderView = ({ stats, selectionIndex }) => {
  const { theme, fonts } = Helper.useTheme();
  // force valid index using clamp to avoid errors on fast change between details
  const selected_stat = useDerivedValue(
    () =>
      selectionIndex.value === null
        ? stats[stats.length - 1]
        : stats[clamp(selectionIndex.value, 0, stats.length - 1)],
    [stats],
  );
  const timestamp_props = useAnimatedProps(() => ({
    text: selected_stat.value.timestamp,
  }));
  const rate_value_props = useAnimatedProps(() => ({
    text: selected_stat.value.value,
  }));
  const change_styles = useAnimatedStyle(() => ({
    color: selected_stat.value.change_color,
  }));
  const change_props = useAnimatedProps(() => ({
    text: selected_stat.value.change,
  }));
  return (
    <>
      <AnimateableText
        style={[
          fonts.subhead,
          {
            color: Settings.getGrayColor(theme),
            marginBottom: Settings.SMALL_PADDING,
          },
          {
            // borderWidth: 1,
            // borderColor: 'green',
          },
        ]}
        numberOfLines={1}
        animatedProps={timestamp_props}
      />
      <View
        style={[
          {
            flexDirection: 'row',
            // justifyContent: 'space-between',
            alignItems: 'flex-end',
          },
          {
            // borderWidth: 1,
            // borderColor: 'green',
          },
        ]}
      >
        <AnimateableText
          style={[
            fonts.title,
            {
              // prevents data cut-off when the cursor moves quickly
              flex: 1,
            },
            {
              // borderWidth: 1,
              // borderColor: 'blue',
            },
          ]}
          numberOfLines={1}
          animatedProps={rate_value_props}
        />
        <AnimateableText
          style={[
            fonts.body,
            {
              textAlign: 'right',
              // prevents flickering when the cursor moves quickly
              width: '35%',
            },
            {
              // borderWidth: 1,
              // borderColor: 'red',
            },
            change_styles,
          ]}
          numberOfLines={1}
          animatedProps={change_props}
          ellipsizeMode="middle"
        />
      </View>
    </>
  );
};

const withAxisDimension = (Component) => (props) => {
  const {
    data,
    domain: {
      y: [, max_y],
    },
  } = props;
  // force onLayout on every data update
  const reloadKey = React.useMemo(() => Date.now(), [data]);
  const [layoutData, setLayoutData] = React.useState();
  const onLayout = ({
    nativeEvent: {
      layout: { width, height },
    },
  }) => {
    const axis_y_width = Helper.roundToNearestEven(width);
    const axis_font_height = Helper.roundToNearestEven(height);
    // fire updates together to keep the data / render in sync
    setLayoutData({
      ...props,
      // add aditional data
      axis_y_width,
      axis_font_height,
    });
  };
  const { theme } = Helper.useTheme();
  return (
    <>
      <Text
        // font scaling is disabled on SVG
        allowFontScaling={false}
        onLayout={onLayout}
        style={{
          position: 'absolute',
          fontSize: AXIS_FONT_SIZE,
          opacity: 0,
          // https://github.com/expo/expo/issues/1959#issuecomment-780198250
          fontFamily: Settings.getFontObject().fontFamily,
          color: Settings.getGrayColor(theme),
        }}
        key={reloadKey}
      >
        {/* WARNING: same as tickFormat */}
        {Helper.getCurrency(max_y)}
      </Text>
      {layoutData && (
        <Component
          {...{
            ...layoutData,
          }}
        />
      )}
    </>
  );
};

const InteractiveRateChartView = compose(withAxisDimension)(({
  width,
  height,
  stats,
  data,
  domain,
  selectionIndex,
  // extras
  axis_y_width: axis_y_width_rounded,
  axis_font_height: axis_font_height_rounded,
}) => {
  const { theme } = Helper.useTheme();
  const ticks_x = React.useMemo(() => {
    const [min_x, max_x] = domain.x;
    return Helper.getTickValues(min_x, max_x, TICKS_X);
  }, [domain]);
  const ticks_y = React.useMemo(() => {
    const [min_y, max_y] = domain.y;
    return Helper.getTickValues(min_y, max_y, TICKS_Y);
  }, [domain]);
  const victory_padding = React.useMemo(
    () => ({
      bottom: AXIS_OFFSET + axis_font_height_rounded,
      left: AXIS_OFFSET + axis_y_width_rounded,
    }),
    [axis_y_width_rounded, axis_font_height_rounded],
  );
  const overlay_style = React.useMemo(
    () => ({
      position: 'absolute',
      top: Settings.PADDING,
      left: AXIS_OFFSET + axis_y_width_rounded + Settings.PADDING,
      // size required by AnimatedChartView
      width:
        width - (AXIS_OFFSET + axis_y_width_rounded + Settings.PADDING * 2),
      height:
        height -
        (AXIS_OFFSET + axis_font_height_rounded + Settings.PADDING * 2),
    }),
    [axis_y_width_rounded, axis_font_height_rounded],
  );
  const axis_x_format = React.useCallback(
    // invalid values when animated
    (value) => stats[Math.round(value)]?.timestamp_axis,
    [stats],
  );
  const axis_x_style = React.useMemo(
    () => ({
      axis: {
        strokeWidth: 1,
        stroke: Settings.getStrokeColor(theme),
      },
      grid: {
        strokeWidth: 1,
        stroke: Settings.getStrokeColor(theme, true),
        strokeLinecap: 'round',
        strokeDasharray: [2, 2],
      },
      ticks: {
        strokeWidth: 1,
        stroke: Settings.getStrokeColor(theme),
        size: AXIS_TICK_SIZE,
      },
      tickLabels: {
        fontSize: AXIS_FONT_SIZE,
        padding: 0,
        fill: Settings.getGrayColor(theme),
        // https://github.com/expo/expo/issues/1959#issuecomment-780198250
        fontFamily: Settings.getFontObject().fontFamily,
      },
    }),
    [theme],
  );
  const axis_y_format = React.useCallback(
    (value) => Helper.getCurrency(value),
    [],
  );
  const axis_y_style = React.useMemo(
    () => ({
      axis: {
        strokeWidth: 0,
        stroke: Settings.getStrokeColor(theme),
      },
      grid: {
        strokeWidth: 1,
        stroke: Settings.getStrokeColor(theme, true),
        strokeLinecap: 'round',
      },
      ticks: {
        strokeWidth: 1,
        stroke: Settings.getStrokeColor(theme),
        size: 0,
      },
      tickLabels: {
        fontSize: AXIS_FONT_SIZE,
        padding: 0,
        fill: Settings.getGrayColor(theme),
        // https://github.com/expo/expo/issues/1959#issuecomment-780198250
        fontFamily: Settings.getFontObject().fontFamily,
      },
    }),
    [theme],
  );
  const color = React.useMemo(
    () => stats[stats.length - 1].change_color,
    [stats],
  );
  const transparent_axis_style = React.useMemo(
    () => ({
      axis: { stroke: 'transparent' },
      ticks: { stroke: 'transparent' },
      tickLabels: { fill: 'transparent' },
    }),
    [],
  );
  const area_style = React.useMemo(
    () => ({
      data: {
        stroke: color,
        strokeWidth: Settings.CHART_STROKE_WIDTH,
        strokeLinecap: 'round',
        fill: color,
        fillOpacity: 0.15,
      },
    }),
    [color],
  );
  return (
    <>
      <View pointerEvents="none">
        <VictoryChart
          width={width}
          height={height}
          singleQuadrantDomainPadding={false}
          domainPadding={Settings.PADDING}
          padding={victory_padding}
          domain={domain}
          animate={false}
        >
          <VictoryAxis
            // prevent rendering issues when values are close to 0
            offsetY={Settings.PADDING + AXIS_LABEL_PADDING + 1}
            tickValues={ticks_x}
            tickFormat={axis_x_format}
            tickLabelComponent={<VictoryLabel dy={AXIS_LABEL_PADDING} />}
            fixLabelOverlap
            style={axis_x_style}
          />
          <VictoryAxis
            dependentAxis
            tickValues={ticks_y}
            tickFormat={axis_y_format}
            tickLabelComponent={
              <VictoryLabel x={axis_y_width_rounded} dx={1} textAnchor="end" />
            }
            style={axis_y_style}
          />
          {/* app watermark */}
          <VictoryLabel
            text={Settings.APP_COPYRIGHT}
            // exclude cursor width (half) and the last axis width
            x={width - Settings.PADDING - 10 / 2 - 1}
            // exclude the last axis width
            // x={width - Settings.PADDING - 1}
            y={
              height -
              (AXIS_OFFSET + axis_font_height_rounded + Settings.PADDING)
            }
            textAnchor="end"
            verticalAnchor="middle"
            backgroundPadding={{
              top: Settings.SMALL_PADDING,
              bottom: Settings.SMALL_PADDING,
              left: Settings.SMALL_PADDING * 2 + 2,
              right: Settings.SMALL_PADDING,
            }}
            backgroundStyle={{
              fill: Settings.getContentColor(theme),
            }}
            // adjustments for background padding
            dx={-Settings.SMALL_PADDING}
            dy={-Settings.SMALL_PADDING}
            style={{
              fontSize: AXIS_FONT_SIZE,
              // fill: Settings.getStrokeColor(theme, true),
              fill: Settings.getStrokeColor(theme),
              // https://github.com/expo/expo/issues/1959#issuecomment-780198250
              fontFamily: Settings.getFontObject().fontFamily,
            }}
          />
        </VictoryChart>
        {/* split is required for watermark */}
        <View style={{ position: 'absolute' }}>
          <VictoryChart
            width={width}
            height={height}
            singleQuadrantDomainPadding={false}
            domainPadding={Settings.PADDING}
            padding={victory_padding}
            domain={domain}
            animate={false}
          >
            <VictoryAxis style={transparent_axis_style} />
            <VictoryAxis dependentAxis style={transparent_axis_style} />
            <VictoryArea
              data={data}
              interpolation="monotoneX"
              style={area_style}
            />
          </VictoryChart>
        </View>
      </View>
      <View style={overlay_style}>
        <AnimatedChartView
          {...{
            data,
            domain,
            color,
            selectionIndex,
            width: overlay_style.width,
            height: overlay_style.height,
          }}
        />
      </View>
    </>
  );
});

export default ({ stats }) => {
  const data = React.useMemo(
    () =>
      stats.map((datum, index) => ({
        x: index,
        y: AmbitoDolar.getRateValue(datum),
        // prevent rendering issues when values are close to 0
        y0: -Settings.PADDING * 2,
      })),
    [stats],
  );
  // data normalization
  const sell_rates = React.useMemo(() => data.map(({ y }) => y), [data]);
  const min_x = React.useMemo(() => data[0].x, [data]);
  const max_x = React.useMemo(() => data[data.length - 1].x, [data]);
  const min_y = React.useMemo(() => Math.min(...sell_rates), [sell_rates]);
  const max_y = React.useMemo(() => Math.max(...sell_rates), [sell_rates]);
  const domain = React.useMemo(
    () => ({
      x: [min_x, max_x],
      y: min_y === max_y ? [min_y - 0.1, max_y + 0.1] : [min_y, max_y],
    }),
    [min_x, max_x, min_y, max_y],
  );
  // add formatted data to stats (required by worklets)
  const { theme } = Helper.useTheme();
  const new_stats = React.useMemo(
    () =>
      stats.map((stat) => ({
        timestamp: DateUtils.humanize(stat[0], 2),
        timestamp_axis: DateUtils.humanize(stat[0], 3),
        value: Helper.getInlineRateValue(stat[1]),
        // ignore when empty
        ...(stat[2] !== undefined && {
          change: AmbitoDolar.getRateChange(stat[2], true),
          change_color: Helper.getChangeColor(stat[2], theme),
        }),
      })),
    [stats, theme],
  );
  // shared
  const selection_index = useSharedValue(null);
  // layout
  const { onLayout, width, height } = useLayout();
  const hasLayout = React.useMemo(() => width && height, [width, height]);
  return (
    <>
      <RateChartHeaderView
        {...{ stats: new_stats, selectionIndex: selection_index }}
      />
      <View
        style={{
          flex: 1,
          marginTop: Settings.PADDING,
        }}
        {...(!hasLayout && { onLayout })}
      >
        {hasLayout ? (
          <InteractiveRateChartView
            {...{
              width: Helper.roundToNearestEven(width),
              height: Helper.roundToNearestEven(height),
              stats: new_stats,
              data,
              domain,
              selectionIndex: selection_index,
            }}
          />
        ) : null}
      </View>
    </>
  );
};
