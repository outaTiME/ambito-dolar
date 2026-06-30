import { View, Text } from 'react-native';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

const HeaderSubtitle = ({ title, subtitle }) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={[fonts.title, { color: Settings.getForegroundColor(theme) }]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={[fonts.footnote, { color: Settings.getGrayColor(theme) }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

export default HeaderSubtitle;
