import { useAssets } from 'expo-asset';
import { useFonts } from 'expo-font';
import { Slot, SplashScreen } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
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
  const [appIsReady, setAppIsReady] = React.useState(false);
  const isReady = fontsLoaded && constantsLoaded && appIsReady;
  React.useEffect(() => {
    async function prepare() {
      try {
        // additional async stuff here
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);
  React.useEffect(() => {
    if (isReady) {
      Helper.debug(
        '👌 Web application loading is completed',
        Date.now() - start_time,
      );
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [isReady]);
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <GestureHandlerRootView>
        <ThemedLayoutWeb />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

export default Sentry.wrap(RootLayoutWeb);
