import * as React from 'react';
import { View, StyleSheet } from 'react-native';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default (alternativeBackground) => (Component) => (props) => {
  const { theme } = Helper.useTheme();
  const background_color = Settings.getBackgroundColor(
    theme,
    alternativeBackground
  );
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: background_color,
        },
      ]}
    >
      <Component backgroundColor={background_color} {...props} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
