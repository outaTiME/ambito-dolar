import React from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

// https://github.com/rainbow-me/rainbow/blob/develop/src/components/toasts/Toast.tsx#L13
const springConfig = {
  mass: 1,
  damping: 14,
  // duration: 1 * 1000,
  stiffness: 121.6,
  overshootClamping: false,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};
const targetTranslate = -Settings.CARD_PADDING * 2;
// subhead lineHeight
const distance = 20 / 2 + Settings.PADDING / 2;

export default ({ isVisible, text, onCompleted }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isVisible ? 1 : 0, undefined, (isFinished) => {
        onCompleted && runOnJS(onCompleted)(isVisible, isFinished);
      }),
      transform: [
        {
          translateY: withSpring(
            isVisible ? targetTranslate : distance,
            springConfig,
          ),
        },
      ],
    };
  }, [isVisible]);
  const { invertedTheme } = Helper.useTheme();
  return (
    <Animated.View pointerEvents="none" style={animatedStyle}>
      <View
        style={{
          alignSelf: 'center',
          padding: 8,
          paddingHorizontal: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Settings.getBackgroundColor(invertedTheme, true),
          borderRadius: 20,
          bottom: 0,
          maxWidth: Settings.CONTENT_WIDTH - 38,
          position: 'absolute',
          zIndex: 100,
          ...Helper.getShadowDefaults(),
        }}
      >
        <Text
          style={[
            Settings.getFontObject(invertedTheme, 'subhead'),
            {
              // pass
            },
          ]}
          numberOfLines={1}
        >
          {text}
        </Text>
      </View>
    </Animated.View>
  );
};
