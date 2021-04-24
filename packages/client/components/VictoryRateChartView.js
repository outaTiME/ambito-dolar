import {
  ChartPathProvider,
  monotoneCubicInterpolation as interpolator,
  ChartDot,
  ChartPath,
  useChartData,
} from '@rainbow-me/animated-charts';
import { useLayout } from '@react-native-community/hooks';
import { processFontFamily } from 'expo-font';
import React from 'react';
import { View, Text, TextInput } from 'react-native';
import Animated, {
  useDerivedValue,
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  VictoryChart,
  VictoryArea,
  VictoryAxis,
  VictoryLabel,
} from 'victory-native';

import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const AXIS_FONT_SIZE = 10;
const TICKS_X = Settings.MAX_NUMBER_OF_STATS;
const TICKS_Y = 5;
const AXIS_TICK_SIZE = 5;
const AXIS_LABEL_PADDING = Settings.PADDING - AXIS_TICK_SIZE;
const AXIS_OFFSET = AXIS_TICK_SIZE + AXIS_LABEL_PADDING;
// https://github.com/rainbow-me/react-native-animated-charts/blob/master/src/charts/linear/ChartPath.js#L663
const ANIMATED_CHART_OFFSET = 10;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const RateChartOverlayView = ({ color, style }) => {
  const { onLayout, width, height } = useLayout();
  const hasLayout = React.useMemo(() => width && height, [width, height]);
  return (
    <View style={style} {...(!hasLayout && { onLayout })}>
      {hasLayout ? (
        <>
          <ChartPath
            hitSlop={Settings.PADDING}
            /* longPressGestureHandlerProps={{
              minDurationMs: 60,
            }} */
            height={height - 20}
            width={width}
            stroke={__DEV__ ? 'magenta' : 'none'}
            // stroke="none"
            selectedOpacity={1}
            strokeWidth={Settings.CHART_STROKE_WIDTH / 2}
            selectedStrokeWidth={Settings.CHART_STROKE_WIDTH / 2}
            strokeDasharray={[2, 4]}
            timingAnimationConfig={{ duration: Settings.ANIMATION_DURATION }}
          />
          <ChartDot size={12} style={{ backgroundColor: color }} />
        </>
      ) : null}
    </View>
  );
};

const RateChartHeaderView = ({ stats }) => {
  const { theme, fonts } = Helper.useTheme();
  const { originalX } = useChartData();
  const default_stat = React.useMemo(() => stats[stats.length - 1], [stats]);
  const selected_stat = useDerivedValue(() => {
    const value = originalX.value;
    if (value !== '') {
      const start = 0;
      const range = stats.length - 1;
      const index = Math.round(((value - start) / range) * (stats.length - 1));
      return stats[index];
    }
    // last item by default
    return default_stat;
  }, [originalX, stats, default_stat]);
  const timestamp_props = useAnimatedProps(() => {
    const stat = selected_stat.value;
    const timestamp = stat && stat.timestamp;
    return {
      text: timestamp || '',
    };
  }, [selected_stat]);
  const rate_value_props = useAnimatedProps(() => {
    const stat = selected_stat.value;
    const value = stat && stat.value;
    return {
      text: value || '',
    };
  }, [selected_stat]);
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
  }, [selected_stat]);
  const change_props = useAnimatedProps(() => {
    const stat = selected_stat.value;
    const change = stat && stat.change;
    return {
      text: change || '',
    };
  }, [selected_stat]);
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
  yRange: y_range,
}) => {
  const { theme } = Helper.useTheme();
  // data normalization
  const min_x = React.useMemo(() => {
    return data[0].x;
  }, [data]);
  const max_x = React.useMemo(() => {
    return data[data.length - 1].x;
  }, [data]);
  const ticks_x = React.useMemo(() => {
    return Helper.getTickValues(min_x, max_x, TICKS_X);
  }, [min_x, max_x]);
  const ticks_y = React.useMemo(() => {
    return Helper.getTickValues(y_range[0], y_range[1], TICKS_Y);
  }, [y_range]);
  // layout
  const { onLayout, width: axis_y_width } = useLayout();
  const victory_padding = React.useMemo(
    () => ({
      bottom: AXIS_OFFSET + AXIS_FONT_SIZE + Settings.CHART_STROKE_WIDTH,
      left: AXIS_OFFSET + axis_y_width,
    }),
    [axis_y_width]
  );
  const victory_domain = React.useMemo(
    () => ({ x: [min_x, max_x], y: y_range }),
    [min_x, max_x, y_range]
  );
  const overlay_style = React.useMemo(
    () => ({
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: AXIS_OFFSET + AXIS_FONT_SIZE + Settings.CHART_STROKE_WIDTH,
      left: AXIS_OFFSET + axis_y_width,
      margin: Settings.PADDING,
      marginVertical: Settings.PADDING - ANIMATED_CHART_OFFSET,
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
  const color = React.useMemo(() => stats[stats.length - 1].change_color, [
    stats,
  ]);
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
        {Helper.getCurrency(y_range[1])}
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
          domain={victory_domain}
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
      <RateChartOverlayView
        {...{
          color,
          style: overlay_style,
        }}
      />
    </>
  );
};

const RateChartView = ({ stats, data, yRange }) => {
  const { onLayout, width, height } = useLayout();
  const hasLayout = React.useMemo(() => width && height, [width, height]);
  return (
    <>
      <RateChartHeaderView {...{ stats }} />
      <View style={{ flex: 1 }} {...(!hasLayout && { onLayout })}>
        {hasLayout ? (
          <InteractiveRateChartView
            {...{
              width,
              height,
              stats,
              data,
              yRange,
            }}
          />
        ) : null}
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
  const sell_rates = React.useMemo(() => {
    return data.map(({ y }) => y);
  }, [data]);
  const y_range = React.useMemo(() => {
    const min_y = Math.min(...sell_rates);
    const max_y = Math.max(...sell_rates);
    // prevent bad rendering when stable data
    if (min_y === max_y) {
      return [min_y - 0.1, max_y + 0.1];
    }
    return [min_y, max_y];
  }, [sell_rates]);
  const animatedChartData = React.useMemo(
    () => ({
      points: interpolator({
        data,
        range: 80,
      }),
      yRange: y_range,
      smoothingStrategy: 'bezier',
    }),
    [data, y_range]
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
  return (
    <ChartPathProvider data={animatedChartData}>
      <RateChartView
        {...{
          stats: new_stats,
          data,
          yRange: y_range,
        }}
      />
    </ChartPathProvider>
  );
};
