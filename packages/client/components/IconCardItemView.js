import FontAwesome6 from '@expo/vector-icons/build/vendor/react-native-vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/MaterialCommunityIcons';
import { View, Text } from 'react-native';

import CardItemView from '../components/CardItemView';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ title, iconName, iconColor, onAction, community }) => {
  const { theme, fonts } = Helper.useTheme();
  const Icon = community === true ? MaterialCommunityIcons : FontAwesome6;
  return (
    <CardItemView
      title={
        <View
          style={[
            {
              flexShrink: 0,
              flexGrow: 1,
              flexDirection: 'row',
              alignItems: 'center',
            },
          ]}
        >
          <Icon
            name={iconName}
            size={Settings.SOCIAL_ICON_SIZE}
            color={iconColor ?? Settings.getForegroundColor(theme)}
          />
          <Text
            style={[fonts.body, { marginLeft: Settings.PADDING }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      }
      useSwitch={false}
      chevron={false}
      onAction={onAction}
    />
  );
};
