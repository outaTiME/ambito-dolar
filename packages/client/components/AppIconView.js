import React from 'react';
import { Platform, Image } from 'react-native';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ half = false, ...props }) => {
  const appIcon = Helper.useAppIcon();
  let size = Platform.OS === 'web' ? 62 : 72;
  if (half) {
    size = size / 2;
  }
  return (
    <Image
      style={{
        width: size,
        height: size,
        borderRadius: Settings.BORDER_RADIUS,
      }}
      source={appIcon}
      fadeDuration={0}
      {...props}
    />
  );
};
