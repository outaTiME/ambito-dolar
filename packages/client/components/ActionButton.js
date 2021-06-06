import * as React from 'react';
import { View, Text } from 'react-native';
import { RectButton, BorderlessButton } from 'react-native-gesture-handler';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const ButtonText = ({ title }) => {
  const { fonts } = Helper.useTheme();
  return (
    <Text
      style={[
        fonts.subhead,
        {
          textAlign: 'center',
          textTransform: 'uppercase',
          paddingVertical: Settings.PADDING / 2,
          paddingHorizontal: Settings.PADDING * 2,
        },
      ]}
    >
      {title}
    </Text>
  );
};

export default ({
  title,
  handleOnPress,
  borderless,
  style,
  alternativeBackground,
}) => {
  const { theme } = Helper.useTheme();
  if (borderless) {
    return (
      <View
        style={[
          {
            alignSelf: 'center',
          },
          style,
        ]}
      >
        <BorderlessButton onPress={handleOnPress}>
          <ButtonText {...{ title }} />
        </BorderlessButton>
      </View>
    );
  }
  return (
    <View
      style={[
        {
          alignSelf: 'center',
          borderRadius: Settings.BORDER_RADIUS,
          borderWidth: Settings.BORDER_WIDTH,
          borderColor: Settings.getStrokeColor(theme),
          backgroundColor: Settings.getContentColor(
            theme,
            alternativeBackground
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
      >
        <ButtonText {...{ title }} />
      </RectButton>
    </View>
  );
};
