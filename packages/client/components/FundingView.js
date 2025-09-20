import { Text } from 'react-native';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ style, condensed }) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <Text
      style={[
        condensed === true ? fonts.subhead : fonts.body,
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
