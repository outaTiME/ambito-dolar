import React from 'react';
import { Pressable, StyleSheet, Text, View, PixelRatio } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

import Settings from '../config/settings';

const SPRING = {
  stiffness: 150,
  damping: 20,
  mass: 1,
  overshootClamping: false,
  restSpeedThreshold: 0.001,
  restDisplacementThreshold: 0.001,
};

const rp = (n) => {
  const s = PixelRatio.get();
  return Math.round((n ?? 0) * s) / s;
};

export default function AnimatedSegmentedControl({
  segments = [],
  currentIndex = 0,
  onChange = () => {},
  isRTL = false,
  containerMargin = 0,
  segmentedControlWrapper,
  pressableWrapper,
  tileStyle,
  activeTextStyle,
  inactiveTextStyle,
  arrowWrapperStyle,
  arrowTextStyle,
  showDirectionalArrow = false,
  arrowGapWidth = 30,
  gutter = 1,
  endInset = 2,
  selectorRadius = 6,
}) {
  const count = Array.isArray(segments) ? segments.length : 0;
  const hasSegments = count > 0;
  const safeIndex = hasSegments
    ? Math.min(Math.max(0, currentIndex), count - 1)
    : 0;
  const arrowMode = showDirectionalArrow && count === 2;

  const baseWidth = rp((Settings?.CONTENT_WIDTH ?? 0) - containerMargin * 2);
  const innerWidth = rp(baseWidth - gutter * 2);
  const gap = arrowMode ? rp(arrowGapWidth) : 0;
  const availableWidth = rp(Math.max(0, innerWidth - gap));
  const cols = arrowMode ? 2 : Math.max(1, count);
  const segmentWidth = hasSegments ? rp(availableWidth / cols) : 0;
  const tileWidth = segmentWidth;

  const startInset = 0;
  const travelRange = rp(
    Math.max(0, innerWidth - tileWidth - startInset - endInset),
  );
  const maxX = travelRange;
  const step = !arrowMode && cols > 1 ? rp(travelRange / (cols - 1)) : 0;
  const posA = startInset;
  const posB = startInset + maxX;
  const arrowLeft = rp(baseWidth / 2 - 12);
  const epsilon = 1 / PixelRatio.get();

  const idxSV = useSharedValue(safeIndex);
  React.useEffect(() => {
    idxSV.value = safeIndex;
  }, [safeIndex]);

  const arrowScale = useSharedValue(1);
  const arrowOpacity = useSharedValue(1);
  React.useEffect(() => {
    arrowScale.value = withSequence(
      withTiming(0.9, { duration: 110 }),
      withTiming(1, { duration: 160 }),
    );
    arrowOpacity.value = withSequence(
      withTiming(0.7, { duration: 110 }),
      withTiming(1, { duration: 160 }),
    );
  }, [safeIndex]);

  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: arrowOpacity.value,
    transform: [{ scale: arrowScale.value }],
  }));

  const tileAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    if (!hasSegments) {
      return {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 0,
        borderRadius: selectorRadius,
        transform: [{ translateX: 0 }],
      };
    }
    const idx = idxSV.value;
    let x = 0;
    if (arrowMode) {
      x = !isRTL ? (idx === 0 ? posA : posB) : idx === 0 ? posB : posA;
    } else {
      x = !isRTL
        ? startInset + step * idx
        : startInset + step * (cols - 1 - idx);
    }
    const clamped = Math.max(
      startInset,
      Math.min(x, startInset + maxX - epsilon),
    );
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      right: undefined,
      bottom: 0,
      width: tileWidth,
      borderRadius: selectorRadius,
      transform: [{ translateX: withSpring(clamped, SPRING) }],
    };
  }, [
    hasSegments,
    arrowMode,
    isRTL,
    cols,
    tileWidth,
    step,
    posA,
    posB,
    startInset,
    maxX,
    travelRange,
    epsilon,
    selectorRadius,
  ]);

  const activeText = {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111827',
    ...activeTextStyle,
  };
  const inactiveText = {
    fontSize: 15,
    textAlign: 'center',
    color: '#4b5563',
    ...inactiveTextStyle,
  };

  const renderSegment = (label, i) => (
    <Pressable
      key={i}
      onPress={() => onChange(i)}
      style={[
        arrowMode ? styles.segmentFixed : styles.segmentFlex,
        arrowMode && { width: segmentWidth },
        pressableWrapper,
      ]}
    >
      <View style={styles.textWrapper}>
        <Text
          style={[safeIndex === i ? activeText : inactiveText]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );

  if (!hasSegments) return null;

  const arrowChar = isRTL
    ? safeIndex === 0
      ? '←'
      : '→'
    : safeIndex === 0
      ? '→'
      : '←';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { width: baseWidth, paddingHorizontal: gutter },
        segmentedControlWrapper,
      ]}
    >
      <Animated.View
        style={[
          tileAnimatedStyle,
          { backgroundColor: 'transparent' },
          tileStyle,
        ]}
      />
      {arrowMode && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.arrowWrapper,
            { left: arrowLeft },
            arrowAnimatedStyle,
            arrowWrapperStyle,
          ]}
        >
          <Text style={[styles.arrowText, arrowTextStyle]}>{arrowChar}</Text>
        </Animated.View>
      )}
      {arrowMode ? (
        <>
          {renderSegment(segments[0], 0)}
          <View style={{ width: gap }} />
          {renderSegment(segments[1], 1)}
        </>
      ) : (
        segments.map((s, i) => renderSegment(s, i))
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  segmentFlex: { flex: 1, elevation: 9, paddingVertical: 12 },
  segmentFixed: { elevation: 9, paddingVertical: 12 },
  textWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowWrapper: {
    position: 'absolute',
    zIndex: 10,
    top: 0,
    bottom: 0,
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  arrowText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
