import { View, StyleSheet } from 'react-native';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

export default ({ height = StyleSheet.hairlineWidth, style = {} }) => {
  const { theme } = Helper.useTheme();
  return (
    <View
      style={[
        {
          height,
          backgroundColor: Settings.getSeparatorColor(theme),
        },
        style,
      ]}
    />
  );
};
