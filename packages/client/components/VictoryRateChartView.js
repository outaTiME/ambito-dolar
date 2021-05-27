import { useLayout } from '@react-native-community/hooks';
import { processFontFamily } from 'expo-font';
import Animated, {
  useDerivedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { View, Text, TextInput } from 'react-native';
import React from 'react';
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
  // required for AnimatedTextInput
  const default_stat = React.useMemo(() => stats[stats.length - 1], [stats]);
  const selected_stat = useDerivedValue(() =>
    selectionIndex.value === null ? default_stat : stats[selectionIndex.value]
  );
  const timestamp_props = useAnimatedProps(() => {
    const stat = selected_stat.value;
    const timestamp = stat && stat.timestamp;
    return {
      text: timestamp || '',
    };
  });
  const rate_value_props = useAnimatedProps(() => {
    const stat = selected_stat.value;
    const value = stat && stat.value;
    return {
      text: value || '',
    };
  });
  const change_styles = useAnimatedStyle(() => {
    // FIXME: when no change_color use default black?
    const stat = selected_stat.value;
    const change_color = stat && stat.change_color;
    if (change_color) {
      return {
        color: change_color,
      };
    }
    return {};
  });
  const change_props = useAnimatedProps(() => {
    const stat = selected_stat.value;
    const change = stat && stat.change;
    return {
      text: change || '',
    };
  });
  return (
    <>
      <AnimatedTextInput
        style={[
          fonts.subhead,
          {
            color: Settings.getGrayColor(theme),
            // required on android by reanimated
            // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L67
            height: 20,
          },
        ]}
        numberOfLines={1}
        animatedProps={timestamp_props}
        defaultValue={default_stat.timestamp}
        editable={false}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: Settings.PADDING / 2,
          paddingBottom: Settings.PADDING + Settings.PADDING / 2,
        }}
      >
        <AnimatedTextInput
          style={[
            fonts.title,
            {
              flex: 1,
              // required on android by reanimated
              // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L39
              height: 25,
            },
          ]}
          numberOfLines={1}
          animatedProps={rate_value_props}
          defaultValue={default_stat.value}
          editable={false}
        />
        <AnimatedTextInput
          style={[
            fonts.title,
            {
              textAlign: 'right',
              // required on android by reanimated
              // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L39
              height: 25,
            },
            change_styles,
          ]}
          numberOfLines={1}
          animatedProps={change_props}
          defaultValue={default_stat.change}
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
  const { onLayout, width: axis_y_width } = useLayout();
  const victory_padding = React.useMemo(
    () => ({
      bottom: AXIS_OFFSET + AXIS_FONT_SIZE + Settings.CHART_STROKE_WIDTH,
      left: AXIS_OFFSET + axis_y_width,
    }),
    [axis_y_width]
  );
  const axis_x_format = React.useCallback(
    (value) => {
      // invalid values when animated
      return stats[Math.round(value)]?.timestamp_axis;
    },
    [stats]
  );
  const axis_x_style = React.useMemo(
    () => ({
      axis: {
        strokeWidth: 1,
        stroke: Settings.getStrokeColor(theme),
      },
      grid: {
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
        stroke: Settings.getStrokeColor(theme, true),
        strokeLinecap: 'round',
      },
      ticks: {
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
  if (!axis_y_width) {
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
              <VictoryLabel x={axis_y_width} textAnchor="end" />
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
      <ChartAnimatedView
        {...{
          data,
          domain,
          color,
          selectionIndex,
          style: {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: AXIS_OFFSET + AXIS_FONT_SIZE + Settings.CHART_STROKE_WIDTH,
            left: AXIS_OFFSET + axis_y_width,
            margin: Settings.PADDING,
            // marginVertical: Settings.PADDING - Settings.CHART_STROKE_WIDTH / 2,
          },
        }}
      />
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
      <View style={{ flex: 1 }} {...(!hasLayout && { onLayout })}>
        {hasLayout ? (
          <InteractiveRateChartView
            {...{
              width,
              height,
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
