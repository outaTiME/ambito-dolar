import { MaterialIcons, FontAwesome6 } from '@expo/vector-icons';
import { useAssets } from 'expo-asset';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from 'styled-components';

import AppContainer from './components/AppContainer';
import Helper from './utilities/Helper';
import Sentry from './utilities/Sentry';

SplashScreen.preventAutoHideAsync().catch(console.warn);

const ThemedApp = () => {
  const colorScheme = useColorScheme();
  const theme = React.useMemo(() => ({ colorScheme }), [colorScheme]);
  return (
    <ThemeProvider theme={theme}>
      <AppContainer />
    </ThemeProvider>
  );
};

const App = () => {
  const [assets] = useAssets([require('./assets/about-icon-borderless.png')]);
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...FontAwesome6.font,
    'FiraGO-Regular': require('./assets/fonts/FiraGO-Regular.otf'),
  });
  const constantsLoaded = Helper.useApplicationConstants(assets);
  const [appIsReady, setAppIsReady] = React.useState(false);
  const appIsLoading = !fontsLoaded || !constantsLoaded || !appIsReady;
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
  const onLayoutRootView = React.useCallback(async () => {
    if (!appIsLoading) {
      // console.log('👌 Application is loaded');
      await SplashScreen.hideAsync().catch(console.warn);
    }
  }, [appIsLoading]);
  if (appIsLoading) {
    return null;
  }
  return (
    <GestureHandlerRootView onLayout={onLayoutRootView}>
      <ThemedApp />
    </GestureHandlerRootView>
  );
};

export default Sentry.wrap(App);
