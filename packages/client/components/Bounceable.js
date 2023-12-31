import * as React from 'react';
import { useMemo } from 'react';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  /* useDerivedValue,
  withTiming,
  Easing, */
} from 'react-native-reanimated';

export default ({
  children,
  disabled = false,
  noBounce = false,
  onPress,
  activeScale = 0.95,
  springConfig = {
    damping: 10,
    mass: 1,
    stiffness: 300,
  },
  contentContainerStyle,
  delayLongPress = 800,
  delayActiveScale = 0,
  onLongPress,
  immediatePress = true,
  duration = 160,
}) => {
  const onLongPressTimeoutId = useSharedValue(null);
  const scale = useSharedValue(1);
  // https://github.com/rainbow-me/rainbow/blob/develop/src/components/animations/ButtonPressAnimation/ScaleButtonZoomable.tsx#L33
  /* const scaleTraversed = useDerivedValue(() =>
    withTiming(scale.value, {
      duration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
  ); */
  const isActive = useSharedValue(0);
  const sz = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        {
          scale: scale.value,
        },
      ],
    };
  });
  const beginScale = () => {
    scale.value = withSpring(activeScale, springConfig);
  };
  const endScale = () => {
    // clearing up
    isActive.value = 0;
    if (onLongPressTimeoutId.value !== null) {
      clearTimeout(Number(onLongPressTimeoutId.value));
      onLongPressTimeoutId.value = null;
    }
    scale.value = withSpring(1, springConfig);
  };
  const Children = useMemo(
    () =>
      React.createElement(
        Animated.View,
        { style: [contentContainerStyle, sz] },
        children,
      ),
    [contentContainerStyle, sz, children],
  );
  if (noBounce) {
    return Children;
  }
  return React.createElement(
    TapGestureHandler,
    {
      maxDurationMs: 99999999,
      shouldCancelWhenOutside: true,
      onHandlerStateChange: ({ nativeEvent: { state, x, y } }) => {
        if (disabled) {
          return;
        }
        if (state === State.BEGAN) {
          isActive.value = 1;
          // delaying scale beginning
          if (delayActiveScale <= 0) {
            beginScale();
          } else {
            setTimeout(() => {
              if (isActive.value === 1) {
                beginScale();
              }
            }, delayActiveScale);
          }
          // onLongPress
          if (onLongPress) {
            onLongPressTimeoutId.value = setTimeout(() => {
              if (isActive.value === 1) {
                endScale();
                runOnJS(onLongPress)(x, y);
              }
            }, delayLongPress + delayActiveScale);
          }
          return;
        }
        if (state === State.END) {
          if (onPress && isActive.value === 1) {
            // mimicing bounce effect if delay active scale is set
            if (delayActiveScale > 0) {
              beginScale();
            }
            setTimeout(() => {
              endScale();
              if (!immediatePress) {
                runOnJS(onPress)(x, y);
              }
            }, 50);
            if (immediatePress) {
              runOnJS(onPress)(x, y);
            }
            return;
          }
          endScale(); // ending scaling here just in case
          return;
        }
        if (
          state === State.UNDETERMINED ||
          state === State.FAILED ||
          state === State.CANCELLED
        ) {
          endScale();
        }
      },
    },
    Children,
  );
};
