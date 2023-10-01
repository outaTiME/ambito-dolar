import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import Settings from '../config/settings';

const defaultShadowStyle = {
  shadowColor: '#000',
  shadowOffset: {
    width: 1,
    height: 1,
  },
  shadowOpacity: 0.025,
  shadowRadius: 1,
  elevation: 1,
};

const DEFAULT_SPRING_CONFIG = {
  stiffness: 150,
  damping: 20,
  mass: 1,
  overshootClamping: false,
  restSpeedThreshold: 0.001,
  restDisplacementThreshold: 0.001,
};

// https://github.com/Karthik-B-06/react-native-segmented-control/pull/74
export default ({
  segments,
  currentIndex,
  onChange,
  badgeValues = [],
  isRTL = false,
  containerMargin = 0,
  activeTextStyle,
  inactiveTextStyle,
  segmentedControlWrapper,
  pressableWrapper,
  tileStyle,
  activeBadgeStyle,
  inactiveBadgeStyle,
  badgeTextStyle,
}) => {
  const width = Settings.CONTENT_WIDTH - containerMargin * 2;
  const translateValue = width / segments.length;
  const tabTranslateValue = useSharedValue(currentIndex);
  // If phone is set to RTL, make sure the animation does the correct transition.
  const transitionMultiplier = isRTL ? -1 : 1;

  // useCallBack with an empty array as input, which will call inner lambda only once and memoize the reference for future calls
  const memoizedTabPressCallback = React.useCallback(
    (index) => {
      onChange(index);
    },
    [onChange],
  );
  useEffect(() => {
    tabTranslateValue.value = currentIndex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const tabTranslateAnimatedStyles = useAnimatedStyle(() => {
    const translateX = withSpring(
      tabTranslateValue.value * (translateValue * transitionMultiplier),
      DEFAULT_SPRING_CONFIG,
    );
    return {
      transform: [{ translateX }],
    };
  }, [translateValue, transitionMultiplier]);

  const finalisedActiveTextStyle = {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111827',
    ...activeTextStyle,
  };

  const finalisedInActiveTextStyle = {
    fontSize: 15,
    textAlign: 'center',
    color: '#4b5563',
    ...inactiveTextStyle,
  };

  const finalisedActiveBadgeStyle = {
    backgroundColor: '#27272a',
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
    ...activeBadgeStyle,
  };

  const finalisedInActiveBadgeStyle = {
    backgroundColor: '#6b7280',
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
    ...inactiveBadgeStyle,
  };

  const finalisedBadgeTextStyle = {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    color: '#FFFFFF',
    ...badgeTextStyle,
  };

  return (
    <Animated.View
      style={[styles.defaultSegmentedControlWrapper, segmentedControlWrapper]}
    >
      <Animated.View
        style={[
          styles.movingSegmentStyle,
          defaultShadowStyle,
          tileStyle,
          StyleSheet.absoluteFill,
          {
            width: width / segments.length - 4,
          },
          tabTranslateAnimatedStyles,
        ]}
      />
      {segments.map((segment, index) => {
        return (
          <Pressable
            onPress={() => memoizedTabPressCallback(index)}
            key={index}
            style={[styles.touchableContainer, pressableWrapper]}
          >
            <View style={styles.textWrapper}>
              <Text
                style={[
                  currentIndex === index
                    ? finalisedActiveTextStyle
                    : finalisedInActiveTextStyle,
                ]}
              >
                {segment}
              </Text>
              {badgeValues[index] && (
                <View
                  style={[
                    styles.defaultBadgeContainerStyle,
                    currentIndex === index
                      ? finalisedActiveBadgeStyle
                      : finalisedInActiveBadgeStyle,
                  ]}
                >
                  <Text style={finalisedBadgeTextStyle}>
                    {badgeValues[index]}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  defaultSegmentedControlWrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  touchableContainer: {
    flex: 1,
    elevation: 9,
    paddingVertical: 12,
  },
  textWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  movingSegmentStyle: {
    top: 0,
    marginVertical: 2,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  // Badge Styles
  defaultBadgeContainerStyle: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 16,
    width: 16,
    borderRadius: 9999,
    alignContent: 'flex-end',
  },
});
