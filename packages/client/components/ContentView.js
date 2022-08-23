import React from 'react';
import { View } from 'react-native';

import Settings from '../config/settings';

export default React.forwardRef(
  ({ children, style, contentContainerStyle }, ref) => (
    <View
      style={[
        {
          alignSelf: 'center',
          width: Math.min(Settings.DEVICE_WIDTH, Settings.MAX_DEVICE_WIDTH),
        },
        style,
      ]}
      ref={ref}
    >
      <View style={[{ margin: Settings.CARD_PADDING }, contentContainerStyle]}>
        {children}
      </View>
    </View>
  )
);
