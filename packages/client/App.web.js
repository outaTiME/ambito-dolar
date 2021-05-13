import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFonts } from '@use-expo/font';
import AppLoading from 'expo-app-loading';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import AppContainer from './components/AppContainer';
import Helper from './utilities/Helper';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...FontAwesome5.font,
    'FiraGO-Regular': require('./assets/fonts/FiraGO-Regular-Minimal.otf'),
  });
  const colorScheme = Helper.useColorScheme();
  const theme = React.useMemo(() => ({ colorScheme }), [colorScheme]);
  if (!fontsLoaded) {
    return <AppLoading />;
  }
  return (
    <ThemeProvider theme={theme}>
      <AppContainer />
    </ThemeProvider>
  );
}
