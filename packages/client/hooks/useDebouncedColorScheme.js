import _ from 'lodash';
import React from 'react';
import { Appearance } from 'react-native';

export default useDebouncedColorScheme = (delay = 500) => {
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
    Appearance.addChangeListener(onColorSchemeChange);
    return () => {
      onColorSchemeChange.cancel();
      Appearance.removeChangeListener(onColorSchemeChange);
    };
  }, []);
  return colorScheme;
};
