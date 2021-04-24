import * as React from 'react';
import { View, Text } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ title, handleOnPress }) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <View
      style={{
        alignSelf: 'center',
        borderRadius: Settings.BORDER_RADIUS,
        borderWidth: Settings.BORDER_WIDTH,
        borderColor: Settings.getStrokeColor(theme),
        backgroundColor: Settings.getContentColor(theme),
        overflow: 'hidden',
      }}
    >
      <RectButton
        onPress={handleOnPress}
        activeOpacity={1}
        underlayColor={Settings.getStrokeColor(theme, true)}
      >
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
      </RectButton>
    </View>
  );
};
