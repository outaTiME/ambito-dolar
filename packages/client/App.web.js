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

const start_time = Date.now();
SplashScreen.preventAutoHideAsync().catch(console.warn);

const ThemedApp = () => {
  const colorScheme = useColorScheme();
  const theme = React.useMemo(() => ({ colorScheme }), [colorScheme]);
  React.useEffect(() => {
    // hide splash screen after storage restore
    Helper.debug(
      '👌 Application loading is completed',
      Date.now() - start_time,
    );
    SplashScreen.hideAsync().catch(console.warn);
  }, []);
  return (
    <ThemeProvider theme={theme}>
      <AppContainer />
    </ThemeProvider>
  );
};

const App = () => {
  const [assets] = useAssets([require('./assets/about-icon-borderless.png')]);
  const [fontsLoaded] = useFonts({
    'FiraGO-Regular': require('./assets/fonts/FiraGO-Regular.otf'),
    FontAwesome6_Brands: require('./node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Brands.ttf'),
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
  if (appIsLoading) {
    return null;
  }
  return (
    <GestureHandlerRootView>
      <ThemedApp />
    </GestureHandlerRootView>
  );
};

export default Sentry.wrap(App);
