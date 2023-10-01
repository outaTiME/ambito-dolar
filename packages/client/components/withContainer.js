import React from 'react';
import { View } from 'react-native';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default (alternativeBackground) => (Component) => (props) => {
  const { theme } = Helper.useTheme();
  const isModal = props?.route?.params?.modal === true;
  const background_color = Settings.getBackgroundColor(
    theme,
    alternativeBackground,
    isModal,
  );
  const container_style = React.useMemo(
    () => ({
      flex: 1,
      justifyContent: 'center',
      backgroundColor: background_color,
    }),
    [background_color],
  );
  return (
    <View style={container_style}>
      <Component
        backgroundColor={background_color}
        isModal={isModal}
        {...props}
      />
    </View>
  );
};
