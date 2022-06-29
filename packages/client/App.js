import 'expo-dev-client';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import {
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons';
import * as Amplitude from 'expo-analytics-amplitude';
import { useAssets } from 'expo-asset';
import * as Device from 'expo-device';
import { useFonts } from 'expo-font';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React from 'react';
import { Text, TextInput, LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootSiblingParent } from 'react-native-root-siblings';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from 'styled-components';

import AppContainer from './components/AppContainer.js';
import Settings from './config/settings';
import useColorScheme from './hooks/useColorScheme';
import { store, persistor } from './store';
import Helper from './utilities/Helper';
import Sentry from './utilities/Sentry';

if (__DEV__) {
  LogBox.ignoreLogs([
    // 'Setting a timer for a long period of time',
    'Amplitude client has not been initialized',
    'Constants.installationId has been deprecated',
    'ViewPropTypes will be removed from React Native',
    "Seems like you're using an old API with gesture components",
  ]);
} else {
  Sentry.configure(Settings.SENTRY_URI);
  Amplitude.initializeAsync(Settings.AMPLITUDE_KEY).catch(console.warn);
}

// disable font scaling in whole app (iOS only)
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = Settings.ALLOW_FONT_SCALING;
Text.defaultProps.maxFontSizeMultiplier = 1;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.allowFontScaling = Settings.ALLOW_FONT_SCALING;
TextInput.defaultProps.maxFontSizeMultiplier = 1;

const ThemedApp = () => {
  const colorScheme = useColorScheme();
  // const colorScheme = 'dark';
  const theme = React.useMemo(() => ({ colorScheme }), [colorScheme]);
  const statusBarStyle = colorScheme
    ? Helper.getInvertedTheme(colorScheme)
    : 'auto';
  // same as AppContainer
  const backgroundColor = Settings.getBackgroundColor(colorScheme, true);
  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(backgroundColor);
  }, [backgroundColor]);
  return (
    <ThemeProvider theme={theme}>
      <StatusBar style={statusBarStyle} animated />
      <RootSiblingParent>
        <ActionSheetProvider>
          <SafeAreaProvider>
            <AppContainer />
          </SafeAreaProvider>
        </ActionSheetProvider>
      </RootSiblingParent>
    </ThemeProvider>
  );
};

// force landscape on android tablets
Platform.OS === 'android' &&
  Device.getDeviceTypeAsync()
    .then((deviceType) =>
      ScreenOrientation.lockAsync(
        deviceType === Device.DeviceType.PHONE
          ? ScreenOrientation.OrientationLock.PORTRAIT_UP
          : ScreenOrientation.OrientationLock.LANDSCAPE
      )
    )
    .catch(console.warn);

export default function App() {
  const [assetsLoaded] = useAssets([
    require('./assets/about-icon-borderless.png'),
  ]);
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
    ...FontAwesome5.font,
    'FiraGO-Regular': require('./assets/fonts/FiraGO-Regular-Minimal.otf'),
    // 'SF-Pro-Rounded-Regular': require('./assets/fonts/SF-Pro-Rounded-Regular.otf'),
  });
  const constantsLoaded = Helper.useApplicationConstants();
  const [appIsReady, setAppIsReady] = React.useState(false);
  const appIsLoading =
    !assetsLoaded || !fontsLoaded || !constantsLoaded || !appIsReady;
  React.useEffect(() => {
    async function prepare() {
      try {
        // Keep the splash screen visible while we fetch resources
        await SplashScreen.preventAutoHideAsync();
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
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <ThemedApp />
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
}
