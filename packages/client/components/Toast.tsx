import { View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

// https://github.com/rainbow-me/rainbow/blob/develop/src/components/toasts/Toast.tsx#L13
const springConfig = {
  mass: 1,
  damping: 14,
  stiffness: 121.6,
  overshootClamping: false,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

export default ({ isVisible, text, hiddenOffset }) => {
  const targetTranslate = -Settings.CONTENT_MARGIN * 2;
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isVisible ? 1 : 0, {
        duration: 200,
      }),
      transform: [
        {
          translateY: withSpring(
            isVisible ? targetTranslate : hiddenOffset,
            springConfig,
          ),
        },
      ],
    };
  });
  const { invertedTheme } = Helper.useTheme();
  return (
    <Animated.View
      style={[animatedStyle, { marginHorizontal: 19, pointerEvents: 'none' }]}
    >
      <View
        style={{
          alignSelf: 'center',
          padding: Settings.PADDING / 2,
          paddingHorizontal: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Settings.getBackgroundColor(invertedTheme, true),
          borderRadius: hiddenOffset,
          borderCurve: 'continuous',
          bottom: 0,
          maxWidth: '100%',
          position: 'absolute',
          zIndex: 100,
          // https://github.com/rainbow-me/rainbow/blob/develop/src/components/toasts/Toast.tsx#L33
          shadowColor: '#25292E',
          shadowOffset: { width: 6, height: 0 },
          shadowOpacity: 0.14,
          shadowRadius: 10,
        }}
      >
        <Text
          style={[Settings.getFontObject(invertedTheme, 'subhead')]}
          numberOfLines={1}
        >
          {text}
        </Text>
      </View>
    </Animated.View>
  );
};
