import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { View, Text } from 'react-native';

import CardItemView from '@/components/CardItemView';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

export default ({
  title,
  iconName,
  iconColor,
  onAction,
  community,
  iconStyle = 'brand',
}: any) => {
  const { theme, fonts } = Helper.useTheme();
  const size = Settings.SOCIAL_ICON_SIZE;
  const color = iconColor ?? Settings.getForegroundColor(theme);
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
          {community === true ? (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          ) : (
            <FontAwesome6
              iconStyle={iconStyle}
              name={iconName}
              size={size}
              color={color}
            />
          )}
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
