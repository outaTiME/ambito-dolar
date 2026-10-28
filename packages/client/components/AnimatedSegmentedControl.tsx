// @ts-nocheck
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

const SPRING = { stiffness: 150, damping: 20, mass: 1 };
const ARROW_GAP = 30;
const GUTTER = 1;

export default function AnimatedSegmentedControl({
  segments,
  currentIndex,
  onChange,
  segmentedControlWrapper,
  pressableWrapper,
  tileStyle,
  textStyle,
  showDirectionalArrow,
}) {
  const count = segments.length;
  const arrowMode = showDirectionalArrow && count === 2;

  const gap = arrowMode ? ARROW_GAP : 0;
  // the selected index, the spring runs on the ui thread
  const position = useSharedValue(currentIndex);
  React.useEffect(() => {
    position.value = withSpring(currentIndex, SPRING);
  }, [currentIndex]);

  const arrowScale = useSharedValue(1);
  const arrowOpacity = useSharedValue(1);
  React.useEffect(() => {
    if (!arrowMode) {
      return;
    }
    arrowScale.value = withSequence(
      withTiming(0.9, { duration: 110 }),
      withTiming(1, { duration: 160 }),
    );
    arrowOpacity.value = withSequence(
      withTiming(0.7, { duration: 110 }),
      withTiming(1, { duration: 160 }),
    );
  }, [currentIndex, arrowMode]);

  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: arrowOpacity.value,
    transform: [{ scale: arrowScale.value }],
  }));

  // the slot is static, the spring only moves a transform and never lays out the row
  const trackSlotStyle = {
    left: 0,
    right: `${100 - 100 / count}%`,
    marginRight: gap / 2,
  };
  const trackAnimatedStyle = useAnimatedStyle(() => {
    const p = position.value;
    // a percent translate is relative to the tile, one slot per step plus the arrow gap
    return {
      transform: [{ translateX: `${p * 100}%` }, { translateX: p * gap }],
    };
  });

  const renderSegment = (label, i) => (
    <Pressable
      key={i}
      onPress={() => onChange(i)}
      style={[styles.segmentFlex, pressableWrapper]}
    >
      <View style={styles.textWrapper}>
        <Text style={[styles.text, textStyle]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );

  const arrowChar = currentIndex === 0 ? '→' : '←';
  return (
    <View
      style={[
        styles.wrapper,
        { paddingHorizontal: GUTTER },
        segmentedControlWrapper,
      ]}
    >
      {/* inside the padding, the track and the segments share one geometry */}
      <View style={[styles.row, { columnGap: gap }]}>
        <Animated.View
          style={[styles.track, trackSlotStyle, trackAnimatedStyle]}
        >
          <View style={[{ flex: 1, borderCurve: 'continuous' }, tileStyle]} />
        </Animated.View>
        {arrowMode && (
          <Animated.View style={[styles.arrowWrapper, arrowAnimatedStyle]}>
            <Text style={[styles.arrowText, textStyle]}>{arrowChar}</Text>
          </Animated.View>
        )}
        {segments.map(renderSegment)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  segmentFlex: { flex: 1 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  track: { position: 'absolute', top: 0, bottom: 0 },
  textWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { textAlign: 'center' },
  arrowWrapper: {
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: 10,
    top: 0,
    bottom: 0,
    left: '50%',
    width: 24,
    marginLeft: -12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: { includeFontPadding: false },
});
