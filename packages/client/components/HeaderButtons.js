import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { HeaderButtons, HeaderButton } from 'react-navigation-header-buttons';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const MaterialHeaderButton = (props) => {
  const { theme } = Helper.useTheme();
  return (
    <HeaderButton
      {...props}
      IconComponent={MaterialIcons}
      iconSize={Settings.ICON_SIZE}
      color={Settings.getForegroundColor(theme)}
      buttonStyle={[
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
