/* eslint-disable import/no-duplicates */
import 'react-native-gesture-handler';
import 'expo-dev-client';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import {
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome6,
} from '@expo/vector-icons';
import { useAssets } from 'expo-asset';
import { useFonts } from 'expo-font';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { Text, TextInput, Platform } from 'react-native';
import AnimateableText from 'react-native-animateable-text';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootSiblingParent } from 'react-native-root-siblings';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HeaderButtonsProvider } from 'react-navigation-header-buttons';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from 'styled-components';

import AppContainer from './components/AppContainer';
import Settings from './config/settings';
import useColorScheme from './hooks/useColorScheme';
import { store, persistor } from './store';
import Helper from './utilities/Helper';

Text.defaultProps = Text.defaultProps || {};
// Text.defaultProps.allowFontScaling = Settings.ALLOW_FONT_SCALING;
Text.defaultProps.maxFontSizeMultiplier = Settings.MAX_FONT_SIZE_MULTIPLIER;
TextInput.defaultProps = TextInput.defaultProps || {};
// TextInput.defaultProps.allowFontScaling = Settings.ALLOW_FONT_SCALING;
TextInput.defaultProps.maxFontSizeMultiplier =
  Settings.MAX_FONT_SIZE_MULTIPLIER;
AnimateableText.defaultProps = AnimateableText.defaultProps || {};
// AnimateableText.defaultProps.allowFontScaling = Settings.ALLOW_FONT_SCALING;
AnimateableText.defaultProps.maxFontSizeMultiplier =
  Settings.MAX_FONT_SIZE_MULTIPLIER;

SplashScreen.preventAutoHideAsync().catch(console.warn);

// force landscape on android tablets
if (Platform.OS === 'android') {
  ScreenOrientation.lockAsync(
    Settings.IS_TABLET
      ? ScreenOrientation.OrientationLock.LANDSCAPE
      : ScreenOrientation.OrientationLock.PORTRAIT_UP,
  ).catch(console.warn);
}

const ThemedApp = () => {
  const colorScheme = useColorScheme();
  const theme = React.useMemo(() => ({ colorScheme }), [colorScheme]);
  return (
    <ThemeProvider theme={theme}>
      <RootSiblingParent>
        <ActionSheetProvider>
          <HeaderButtonsProvider stackType="native">
            <AppContainer />
          </HeaderButtonsProvider>
        </ActionSheetProvider>
      </RootSiblingParent>
    </ThemeProvider>
  );
};

export default function App() {
  const [assets] = useAssets([require('./assets/about-icon-borderless.png')]);
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
    ...FontAwesome6.font,
    'FiraGO-Regular': require('./assets/fonts/FiraGO-Regular-Minimal.otf'),
    // 'SF-Pro-Rounded-Regular': require('./assets/fonts/SF-Pro-Rounded-Regular.otf'),
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
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <ThemedApp />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
}
