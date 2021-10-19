import _ from 'lodash';
import React from 'react';
import { Platform, Appearance, useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';

// https://github.com/facebook/react-native/issues/28525
export default Platform.OS === 'web'
  ? useColorScheme
  : (delay = 500) => {
      const appearance = useSelector((state) => state.application.appearance);
      const [colorScheme, setColorScheme] = React.useState(
        Appearance.getColorScheme()
      );
      const onColorSchemeChange = React.useCallback(
        _.throttle(
          ({ colorScheme }) => {
            setColorScheme(colorScheme);
          },
          delay,
          {
            leading: false,
          }
        ),
        []
      );
      React.useEffect(() => {
        if (!appearance) {
          Appearance.addChangeListener(onColorSchemeChange);
          return () => {
            onColorSchemeChange.cancel();
            Appearance.removeChangeListener(onColorSchemeChange);
          };
        }
      }, [appearance]);
      return appearance ?? colorScheme;
    };
