import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

export default function App() {
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...FontAwesome5.font,
    'FiraGO-Regular': require('./assets/fonts/FiraGO-Regular-Minimal.otf'),
  });
  const appIsLoading = !fontsLoaded;
  React.useEffect(() => {
    async function prepare() {
      try {
        // Keep the splash screen visible while we fetch resources
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.warn(e);
      }
    }
    prepare();
  }, []);
  const onLayoutRootView = React.useCallback(async () => {
    if (!appIsLoading) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      await SplashScreen.hideAsync();
    }
  }, [appIsLoading]);
  if (appIsLoading) {
    return null;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ThemedApp />
    </GestureHandlerRootView>
  );
}
