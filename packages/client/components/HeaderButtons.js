import MaterialCommunityIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/MaterialIcons';
import React from 'react';
import { HeaderButtons, HeaderButton } from 'react-navigation-header-buttons';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const MaterialHeaderButton = (props) => {
  const { theme } = Helper.useTheme();
  const Icon =
    props.community === true ? MaterialCommunityIcons : MaterialIcons;
  return (
    <HeaderButton
      {...props}
      IconComponent={Icon}
      iconSize={Settings.ICON_SIZE}
      color={Settings.getForegroundColor(theme)}
      buttonStyle={[
        props.iconName && {
          height: Settings.ICON_SIZE,
          width: Settings.ICON_SIZE,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        },
        {
          // perfect fit on native stack
          marginHorizontal: Settings.CARD_PADDING * 2 - 16,
        },
        {
          // borderWidth: 1,
          // borderColor: 'blue',
        },
        props.buttonStyle,
      ]}
    />
  );
};

export const MaterialHeaderButtons = (props) => (
  <HeaderButtons HeaderButtonComponent={MaterialHeaderButton} {...props} />
);

export { Item } from 'react-navigation-header-buttons';
