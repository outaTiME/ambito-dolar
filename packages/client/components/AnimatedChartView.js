import * as d3Shape from 'd3-shape';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  withSpring,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { parse as parsePath, getYForX, clamp } from 'react-native-redash';
import Svg, { Path } from 'react-native-svg';

import Settings from '../config/settings';

const DEBUG_CHART = false;
const CURSOR_SIZE = 10;
const CURSOR_CONTAINER_SIZE = Settings.PADDING * 2;
const EXTRA_OFFSET = Settings.PADDING;

const springDefaultConfig = {
  damping: 15,
  mass: 1,
  stiffness: 600,
};

const Cursor = ({ length, point, width, color }) => {
  const isActive = useSharedValue(false);
  React.useEffect(() => {
    if (isActive.value === false) {
      // update only when no active selection
      length.value = width;
    }
  }, [width]);
  const style = useAnimatedStyle(() => {
    const { coord } = point.value;
    const translateX = coord.x + EXTRA_OFFSET - CURSOR_CONTAINER_SIZE / 2;
    const translateY = coord.y + EXTRA_OFFSET - CURSOR_CONTAINER_SIZE / 2;
    return {
      transform: [
        { translateX },
        { translateY },
        {
          scale: withSpring(isActive.value ? 1.5 : 1, springDefaultConfig),
        },
      ],
    };
  });
  // avoid accessing Settings inside gesture worklet (prevents reanimated warning)
  const hapticsEnabled = Settings.HAPTICS_ENABLED;
  const dragOnLongPressGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(Settings.INTERACTION_DELAY)
        .shouldCancelWhenOutside(false)
        .averageTouches(true)
        .onStart((event) => {
          if (!isActive.value) {
            hapticsEnabled && runOnJS(Haptics.selectionAsync)();
          }
          isActive.value = true;
          length.value = clamp(event.x - EXTRA_OFFSET, 0, width);
        })
        .onUpdate((event) => {
          length.value = clamp(event.x - EXTRA_OFFSET, 0, width);
        })
        .onEnd(() => {
          length.value = width;
          hapticsEnabled && runOnJS(Haptics.selectionAsync)();
          isActive.value = false;
        }),
    [width],
  );
  return (
    <GestureDetector gesture={dragOnLongPressGesture}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { margin: -EXTRA_OFFSET }]}
      >
        <Animated.View style={[styles.cursorContainer, style]}>
          <View style={[styles.cursor, { backgroundColor: color }]} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const scale = (v, d, r) => {
  'worklet';
  return interpolate(v, d, r, Extrapolation.CLAMP);
};
const scaleInvert = (y, d, r) => {
  'worklet';
  return interpolate(y, r, d, Extrapolation.CLAMP);
};

export default ({ data, domain, color, selectionIndex, width, height }) => {
  const range = React.useMemo(
    () => ({
      x: [0, width],
      y: [height, 0],
    }),
    [width, height],
  );
  const d = React.useMemo(
    () =>
      d3Shape
        .line()
        .x(({ x }) => scale(x, domain.x, range.x))
        .y(({ y }) => scale(y, domain.y, range.y))
        .curve(d3Shape.curveMonotoneX)(data),
    [data, domain, range],
  );
  const length = useSharedValue(width);
  const path = React.useMemo(() => parsePath(d), [d]);
  const point = useDerivedValue(() => {
    const x_value = length.value;
    const coord = {
      x: x_value,
      // there "should" always be a value
      y: getYForX(path, x_value) || 0,
    };
    return {
      coord,
      index: Math.round(scaleInvert(coord.x, domain.x, range.x)),
    };
  }, [path, domain, range]);
  useAnimatedReaction(
    () => point.value,
    ({ index }) => {
      // reset selection when last data point
      selectionIndex.value = index === data.length - 1 ? null : index;
    },
    [data],
  );
  return (
    <>
      {DEBUG_CHART && (
        <Svg {...{ width, height }}>
          <Path
            fill="transparent"
            stroke="magenta"
            strokeWidth={Settings.CHART_STROKE_WIDTH}
            strokeDasharray={[2, 4]}
            {...{ d }}
          />
        </Svg>
      )}
      <Cursor {...{ length, point, width, color }} />
    </>
  );
};

const styles = StyleSheet.create({
  cursorContainer: {
    width: CURSOR_CONTAINER_SIZE,
    height: CURSOR_CONTAINER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    ...(DEBUG_CHART && { backgroundColor: 'rgba(100, 200, 300, 0.4)' }),
  },
  cursor: {
    width: CURSOR_SIZE,
    height: CURSOR_SIZE,
    borderRadius: CURSOR_SIZE / 2,
  },
});
