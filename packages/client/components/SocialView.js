import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ size = Settings.SOCIAL_ICON_SIZE, extraSpace = false }) => {
  const { theme } = Helper.useTheme();
  return (
    <>
      <FontAwesome5
        name="twitter"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="telegram-plane"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="instagram"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="facebook"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="reddit-alien"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="mastodon"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="square"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="github"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          ...(extraSpace === true && {
            marginRight: Settings.PADDING,
          }),
        }}
      />
    </>
  );
};
