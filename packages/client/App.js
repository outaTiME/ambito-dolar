// https://docs.expo.dev/develop/development-builds/use-development-builds/#add-error-handling
import 'expo-dev-client';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
// import * as BackgroundFetch from 'expo-background-fetch';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
// import * as TaskManager from 'expo-task-manager';
import React from 'react';
import {
  Text,
  TextInput,
  Platform,
  useWindowDimensions,
  View,
} from 'react-native';
// import { requestWidgetUpdate } from 'react-native-android-widget';
import AnimateableText from 'react-native-animateable-text';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from 'styled-components';

import AppContainer from './components/AppContainer';
import Settings, { updateSettings } from './config/settings';
import useColorScheme from './hooks/useColorScheme';
import { store, persistor } from './store';
import Helper from './utilities/Helper';
import Sentry from './utilities/Sentry';

// import { getWidgetProps } from './widgets';
// import RateWidget from './widgets/RateWidget';

const start_time = Date.now();
SplashScreen.preventAutoHideAsync().catch(console.warn);
SplashScreen.setOptions({
  // duration: 1000,
  fade: true,
});

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.maxFontSizeMultiplier = Settings.MAX_FONT_SIZE_MULTIPLIER;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.maxFontSizeMultiplier =
  Settings.MAX_FONT_SIZE_MULTIPLIER;
AnimateableText.defaultProps = AnimateableText.defaultProps || {};
AnimateableText.defaultProps.maxFontSizeMultiplier =
  Settings.MAX_FONT_SIZE_MULTIPLIER;

if (Platform.OS === 'android') {
  // update widgets every 5 minutes
  /* const taskName = 'update-widget';
  // if (!TaskManager.isTaskDefined(taskName)) {
  TaskManager.defineTask(taskName, () =>
    requestWidgetUpdate({
      widgetName: 'Rate',
      renderWidget: async (widgetInfo) => {
        // FIXME: handle exception
        const widgetProps = await getWidgetProps(widgetInfo);
        console.log(
          '>>> Update widget task (render)',
          AmbitoDolar.getTimezoneDate().format(),
          widgetProps,
        );
        return <RateWidget {...widgetProps} />;
      },
    })
      .then(() => {
        console.log(
          '>>> Update widget done',
          AmbitoDolar.getTimezoneDate().format(),
        );
        return BackgroundFetch.BackgroundFetchResult.NewData;
      })
      .catch((e) => {
        console.log(
          '>>> Update widget error',
          AmbitoDolar.getTimezoneDate().format(),
          e,
        );
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }),
  );
  // }
  BackgroundFetch.registerTaskAsync(taskName, {
    minimumInterval: 5 * 60, // 5 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  }).catch(console.warn); */
  // force landscape on tablets
  ScreenOrientation.lockAsync(
    Settings.IS_TABLET
      ? ScreenOrientation.OrientationLock.LANDSCAPE
      : ScreenOrientation.OrientationLock.PORTRAIT_UP,
  ).catch(console.warn);
}

const ThemedApp = () => {
  const colorScheme = useColorScheme();
  const theme = { colorScheme };
  const windowDimensions = useWindowDimensions();
  const [layoutKey, setLayoutKey] = React.useState(null);
  React.useEffect(() => {
    // hide splash screen after storage restore
    Helper.debug(
      '👌 Application loading is completed',
      Date.now() - start_time,
    );
    SplashScreen.hideAsync().catch(console.warn);
  }, []);
  React.useEffect(() => {
    // recalculate layout and update global settings when dimensions change
    Helper.debug(
      '🌀 Layout change detected, resetting app layout',
      windowDimensions,
    );
    updateSettings(windowDimensions);
    // trigger a full remount by updating layoutKey
    requestAnimationFrame(() => {
      setLayoutKey(Helper.getHashId(windowDimensions));
    });
  }, [windowDimensions]);
  // set background color early to avoid white flash on Android
  const backgroundColor = Settings.getBackgroundColor(colorScheme, true);
  return (
    <View style={{ flex: 1, backgroundColor }}>
      {layoutKey && (
        <ThemeProvider theme={theme}>
          <ActionSheetProvider>
            <BottomSheetModalProvider>
              <AppContainer key={layoutKey} />
            </BottomSheetModalProvider>
          </ActionSheetProvider>
        </ThemeProvider>
      )}
    </View>
  );
};

const App = () => {
  const constantsLoaded = Helper.useApplicationConstants();
  const [appIsReady, setAppIsReady] = React.useState(false);
  const appIsLoading = !constantsLoaded || !appIsReady;
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
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <GestureHandlerRootView>
            <ThemedApp />
          </GestureHandlerRootView>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
};

export default Sentry.wrap(App);
