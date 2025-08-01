import { View, Text } from 'react-native';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ style, message }) => {
  const { fonts } = Helper.useTheme();
  return (
    <View
      style={[
        {
          marginHorizontal: Settings.CARD_PADDING,
          padding: Settings.PADDING,
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
