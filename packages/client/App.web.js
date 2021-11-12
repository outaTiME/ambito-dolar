import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AppLoading from 'expo-app-loading';
import { useFonts } from 'expo-font';
import React from 'react';
import { useColorScheme } from 'react-native';
import { ThemeProvider } from 'styled-components';

import AppContainer from './components/AppContainer';

const ThemedApp = () => {
  const colorScheme = useColorScheme();
  const theme = React.useMemo(() => ({ colorScheme }), [colorScheme]);
  return (
    <ThemeProvider theme={theme}>
      <AppContainer />
    </ThemeProvider>
  );
};

export default () => {
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...FontAwesome5.font,
    'FiraGO-Regular': require('./assets/fonts/FiraGO-Regular-Minimal.otf'),
  });

  if (!fontsLoaded) {
    return <AppLoading />;
  }
  return <ThemedApp />;
};
