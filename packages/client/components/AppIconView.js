import { Image } from 'expo-image';
import React from 'react';
import { Platform } from 'react-native';

import Settings from '../config/settings';

export default ({ half = false, ...props }) => {
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
      source={require('../assets/about-icon-borderless.png')}
      {...props}
    />
  );
};
