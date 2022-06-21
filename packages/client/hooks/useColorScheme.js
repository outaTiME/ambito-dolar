/* import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';

export default () => {
  const appearance = useSelector((state) => state.application.appearance);
  const colorScheme = useColorScheme();
  const appColorScheme = appearance ?? colorScheme;
  return appColorScheme;
}; */

import React from 'react';
import { useColorScheme as _useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';

import useAppState from './useAppState';

// https://github.com/facebook/react-native/issues/28525#issuecomment-1041610688

const useColorScheme = () => {
  const appearance = useSelector((state) => state.application?.appearance);
  const colorScheme = _useColorScheme();
  const [currentScheme, setCurrentScheme] = React.useState(
    appearance ?? colorScheme
  );
  const isActiveAppState = useAppState('active');
  React.useEffect(() => {
    const appColorScheme = appearance ?? colorScheme;
    if (isActiveAppState) {
      if (__DEV__) {
        console.log('🌈 Color scheme updated', appColorScheme);
      }
      setCurrentScheme(appColorScheme);
    }
  }, [isActiveAppState, colorScheme, appearance]);
  return currentScheme;
};

export default useColorScheme;
