import { useLayout } from '@react-native-community/hooks';
import { processFontFamily } from 'expo-font';
import React from 'react';
import { View, Text, TextInput } from 'react-native';
import Animated, {
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

import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';
import ChartAnimatedView from './ChartAnimatedView';

const AXIS_FONT_SIZE = 10;
const TICKS_X = Settings.MAX_NUMBER_OF_STATS;
const TICKS_Y = 5;
const AXIS_TICK_SIZE = 5;
const AXIS_LABEL_PADDING = Settings.PADDING - AXIS_TICK_SIZE;
const AXIS_OFFSET = AXIS_TICK_SIZE + AXIS_LABEL_PADDING;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const RateChartHeaderView = ({ stats, selectionIndex }) => {
  const { theme, fonts } = Helper.useTheme();
  // force valid index using clamp to avoid errors on fast change between details
  const selected_stat = useDerivedValue(
    () =>
      selectionIndex.value === null
        ? stats[stats.length - 1]
        : stats[clamp(selectionIndex.value, 0, stats.length - 1)],
    [stats]
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
      <AnimatedTextInput
        underlineColorAndroid="transparent"
        style={[
          fonts.subhead,
          {
            color: Settings.getGrayColor(theme),
            // required on android by reanimated
            // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L67
            height: 20,
            lineHeight: undefined,
          },
        ]}
        numberOfLines={1}
        animatedProps={timestamp_props}
        value={selected_stat.value.timestamp}
        editable={false}
      />
      <View
        style={{
          flexDirection: 'row',
          marginTop: Settings.SMALL_PADDING,
          // marginBottom: Settings.PADDING + Settings.PADDING / 2,
          // marginBottom: Settings.PADDING,
          // required on android by reanimated
          // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L39
          height: 25,
        }}
      >
        <AnimatedTextInput
          underlineColorAndroid="transparent"
          style={[
            fonts.title,
            {
              flex: 1,
              lineHeight: undefined,
            },
          ]}
          numberOfLines={1}
          animatedProps={rate_value_props}
          value={selected_stat.value.value}
          editable={false}
        />
        <AnimatedTextInput
          underlineColorAndroid="transparent"
          textAlign="right"
          style={[
            fonts.title,
            {
              lineHeight: undefined,
            },
            change_styles,
          ]}
          numberOfLines={1}
          animatedProps={change_props}
          value={selected_stat.value.change}
          editable={false}
        />
      </View>
    </>
  );
};

const InteractiveRateChartView = ({
  width,
  height,
  stats,
  data,
  domain,
  selectionIndex,
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
  // layout
  const {
    onLayout,
    width: axis_y_width,
    height: axis_font_height,
  } = useLayout();
  const axis_y_width_rounded = Helper.roundToEven(axis_y_width);
  const axis_font_height_rounded = Helper.roundToEven(axis_font_height);
  const victory_padding = React.useMemo(
    () => ({
      bottom: AXIS_OFFSET + axis_font_height_rounded,
      left: AXIS_OFFSET + axis_y_width_rounded,
    }),
    [axis_y_width_rounded, axis_font_height_rounded]
  );
  const overlay_style = React.useMemo(
    () => ({
      position: 'absolute',
      top: Settings.PADDING,
      left: AXIS_OFFSET + axis_y_width_rounded + Settings.PADDING,
      // size required by ChartAnimatedView
      width:
        width - (AXIS_OFFSET + axis_y_width_rounded + Settings.PADDING * 2),
      height:
        height -
        (AXIS_OFFSET + axis_font_height_rounded + Settings.PADDING * 2),
    }),
    [axis_y_width_rounded, axis_font_height_rounded]
  );
  const axis_x_format = React.useCallback(
    // invalid values when animated
    (value) => stats[Math.round(value)]?.timestamp_axis,
    [stats]
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
        fontFamily: processFontFamily(Settings.getFontObject().fontFamily),
      },
    }),
    [theme]
  );
  const axis_y_format = React.useCallback(
    (value) => Helper.getCurrency(value),
    []
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
        fontFamily: processFontFamily(Settings.getFontObject().fontFamily),
      },
    }),
    [theme]
  );
  const color = React.useMemo(
    () => stats[stats.length - 1].change_color,
    [stats]
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
    [color]
  );
  if (!axis_y_width_rounded && !axis_font_height_rounded) {
    const fontSize = AXIS_FONT_SIZE;
    return (
      <Text
        onLayout={onLayout}
        style={{
          position: 'absolute',
          fontSize,
          opacity: 0,
          // https://github.com/expo/expo/issues/1959#issuecomment-780198250
          fontFamily: processFontFamily(Settings.getFontObject().fontFamily),
        }}
      >
        {/* WARNING: same as tickFormat */}
        {Helper.getCurrency(domain.y[1])}
      </Text>
    );
  }
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
              <VictoryLabel x={axis_y_width_rounded} textAnchor="end" />
            }
            style={axis_y_style}
          />
          <VictoryArea
            data={data}
            interpolation="monotoneX"
            style={area_style}
          />
        </VictoryChart>
      </View>
      <View style={overlay_style}>
        <ChartAnimatedView
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
};

export default ({ stats }) => {
  const data = React.useMemo(
    () =>
      stats.map((datum, index) => ({
        x: index,
        y: Helper.getRateValue(datum),
      })),
    [stats]
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
    [min_x, max_x, min_y, max_y]
  );
  // add formatted data to stats (required by worklets)
  const { theme } = Helper.useTheme();
  const new_stats = React.useMemo(
    () =>
      stats.map((stat) => ({
        timestamp: DateUtils.datetime(stat[0], { long: true }),
        timestamp_axis: DateUtils.date(stat[0], { short: true }),
        value: Helper.getInlineRateValue(stat[1]),
        // ignore when empty
        ...(stat[2] !== undefined && {
          change: Helper.getChange(stat[2]),
          change_color: Helper.getChangeColor(stat[2], theme),
        }),
      })),
    [stats, theme]
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
          // marginTop: Settings.PADDING + Settings.PADDING / 2,
          marginTop: Settings.PADDING + Settings.SMALL_PADDING,
          // marginTop: Settings.PADDING,
          // borderWidth: 1,
          // borderColor: 'red',
        }}
        {...(!hasLayout && { onLayout })}
      >
        {hasLayout ? (
          <InteractiveRateChartView
            {...{
              width: Helper.roundToEven(width),
              height: Helper.roundToEven(height),
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
