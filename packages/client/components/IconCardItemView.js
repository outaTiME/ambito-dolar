import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { View, Text } from 'react-native';

import CardItemView from '../components/CardItemView';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ title, iconName, iconColor, onAction }) => {
  const { theme, fonts } = Helper.useTheme();
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
          <FontAwesome5
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
