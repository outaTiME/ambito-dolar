import React from 'react';
import { View, Text } from 'react-native';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ style, message }) => {
  const { fonts } = Helper.useTheme();
  return (
    <View
      style={[
        {
          // took padding from scrollview
          marginHorizontal: Settings.PADDING * 2,
        },
        style,
      ]}
    >
      <Text
        style={[
          fonts.body,
          {
            textAlign: 'center',
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
};
