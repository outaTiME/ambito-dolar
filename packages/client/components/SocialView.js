import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({
  // same size as "fonts.body" of FundingView
  size = Settings.SOCIAL_ICON_SIZE,
  extraSpace = false,
}) => {
  const { theme } = Helper.useTheme();
  return (
    <>
      <FontAwesome6
        name="x-twitter"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        name="telegram"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        name="instagram"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        name="facebook"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        name="reddit-alien"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: size,
        }}
      />
      <FontAwesome6
        name="mastodon"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: size,
        }}
      />
      {false && (
        <MaterialCommunityIcons
          name="square-rounded"
          size={size}
          color={Settings.getGrayColor(theme)}
          style={{
            marginRight: size,
          }}
        />
      )}
      {false && (
        <FontAwesome6
          name="whatsapp"
          size={size}
          color={Settings.getGrayColor(theme)}
          style={{
            marginRight: size,
          }}
        />
      )}
      <FontAwesome6
        name="github"
        size={size}
        color={Settings.getGrayColor(theme)}
        style={{
          ...(extraSpace === true && {
            marginRight: size,
          }),
        }}
      />
    </>
  );
};
