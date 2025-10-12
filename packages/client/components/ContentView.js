import React from 'react';
import { View } from 'react-native';

import Settings from '../config/settings';

export default React.forwardRef(
  ({ children, style, contentContainerStyle }, ref) => (
    <View
      style={[
        {
          alignSelf: 'center',
          width: Settings.CONTENT_WIDTH,
        },
        style,
      ]}
      ref={ref}
      collapsable={false}
    >
      <View style={[{ margin: Settings.CARD_PADDING }, contentContainerStyle]}>
        {children}
      </View>
    </View>
  ),
);
