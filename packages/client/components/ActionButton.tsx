import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

const ButtonText = ({ title, small = false, colorScheme, loading }) => {
  const { theme, fonts } = Helper.useTheme(colorScheme);
  return (
    <View
      style={{
        paddingVertical: Settings.PADDING / 2,
        paddingHorizontal: Settings.PADDING + Settings.CONTENT_MARGIN,
        justifyContent: 'center',
      }}
    >
      <Text
        style={[
          small === true ? fonts.footnote : fonts.subhead,
          {
            textAlign: 'center',
            textTransform: 'uppercase',
          },
          loading && {
            opacity: 0,
          },
        ]}
      >
        {title}
      </Text>
      {loading && (
        <ActivityIndicator
          animating
          color={Settings.getForegroundColor(theme)}
          size="small"
          style={{ position: 'absolute', alignSelf: 'center' }}
        />
      )}
    </View>
  );
};

export default ({
  title,
  handleOnPress,
  borderless,
  style,
  alternativeBackground,
  small,
  colorScheme,
  loading = false,
}) => {
  const { theme } = Helper.useTheme(colorScheme);
  if (borderless) {
    return (
      <Pressable
        onPress={handleOnPress}
        disabled={loading}
        style={({ pressed }) => [
          { alignSelf: 'center', opacity: pressed ? 0.5 : 1 },
          style,
        ]}
      >
        <ButtonText {...{ title, small, colorScheme, loading }} />
      </Pressable>
    );
  }
  return (
    <View
      style={[
        {
          alignSelf: 'center',
          borderRadius: Settings.BORDER_RADIUS,
          borderCurve: 'continuous',
          borderWidth: Settings.BORDER_WIDTH,
          borderColor: Settings.getStrokeColor(theme),
          backgroundColor: Settings.getContentColor(
            theme,
            alternativeBackground,
          ),
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <RectButton
        onPress={handleOnPress}
        activeOpacity={1}
        underlayColor={Settings.getStrokeColor(theme, true)}
        rippleColor={Settings.getRippleColor(theme)}
        enabled={!loading}
      >
        <ButtonText {...{ title, small, colorScheme, loading }} />
      </RectButton>
    </View>
  );
};
