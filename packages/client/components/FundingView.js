import { Text } from 'react-native';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ style }) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <Text
      style={[
        fonts.body,
        {
          color: Settings.getGrayColor(theme),
        },
        style,
      ]}
      numberOfLines={1}
    >
      {Helper.removeProtocol(Settings.CAFECITO_URL)}
    </Text>
  );
};
