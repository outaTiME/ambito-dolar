import React, { useCallback } from 'react';
import { Animated } from 'react-native';
import { State, TapGestureHandler } from 'react-native-gesture-handler';

export default function FloatingEmojisTapHandler({
  children,
  disabled = false,
  onNewEmoji,
  onPress,
  xOffset,
  yOffset,
  ...props
}) {
  const handleTap = useCallback(
    ({ nativeEvent: { state, x, y } }) => {
      if (state === State.ACTIVE) {
        onNewEmoji?.(x + (xOffset || 0), y + (yOffset || 0));
        onPress?.();
      }
    },
    [onNewEmoji, onPress, yOffset],
  );

  return (
    <TapGestureHandler
      {...props}
      enabled={!disabled}
      onHandlerStateChange={handleTap}
    >
      <Animated.View accessible>{children}</Animated.View>
    </TapGestureHandler>
  );
}
