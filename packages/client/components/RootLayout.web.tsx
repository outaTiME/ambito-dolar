import { useAssets } from 'expo-asset';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from 'styled-components';

import Helper from '@/utilities/Helper';
import Sentry from '@/utilities/Sentry';

const start_time = Date.now();
SplashScreen.preventAutoHideAsync().catch(console.warn);

const ThemedLayoutWeb = () => {
  const colorScheme = useColorScheme();
  const theme = { colorScheme };
  return (
    <ThemeProvider theme={theme}>
      <Slot />
    </ThemeProvider>
  );
};

const RootLayoutWeb = () => {
  useAssets([require('../assets/about-icon-borderless.png')]);
  const [fontsLoaded] = useFonts({
    'FiraGO-Regular': require('../assets/fonts/FiraGO-Regular.otf'),
  });
  const constantsLoaded = Helper.useApplicationConstants();
  const isReady = fontsLoaded && constantsLoaded;
  const onLayoutRootView = React.useCallback(() => {
    if (isReady) {
      Helper.debug(
        '👌 Web application loading is completed',
        Date.now() - start_time,
      );
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [isReady]);
  if (!isReady) {
    return null;
  }
  return (
    <GestureHandlerRootView onLayout={onLayoutRootView}>
      <ThemedLayoutWeb />
    </GestureHandlerRootView>
  );
};

export default Sentry.wrap(RootLayoutWeb);
