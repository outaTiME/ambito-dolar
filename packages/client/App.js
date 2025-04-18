// https://docs.expo.dev/develop/development-builds/use-development-builds/#add-error-handling
import 'expo-dev-client';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { reloadAppAsync } from 'expo';
// import * as BackgroundFetch from 'expo-background-fetch';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import * as _ from 'lodash';
// import * as TaskManager from 'expo-task-manager';
import React from 'react';
import {
  Text,
  TextInput,
  Platform,
  LogBox,
  useWindowDimensions,
} from 'react-native';
// import { requestWidgetUpdate } from 'react-native-android-widget';
import AnimateableText from 'react-native-animateable-text';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { HeaderButtonsProvider } from 'react-navigation-header-buttons';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from 'styled-components';

import AppContainer from './components/AppContainer';
import Settings from './config/settings';
import useColorScheme from './hooks/useColorScheme';
import { store, persistor } from './store';
import Helper from './utilities/Helper';
import Sentry from './utilities/Sentry';

// import { getWidgetProps } from './widgets';
// import RateWidget from './widgets/RateWidget';

const start_time = Date.now();
SplashScreen.preventAutoHideAsync().catch(console.warn);

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.maxFontSizeMultiplier = Settings.MAX_FONT_SIZE_MULTIPLIER;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.maxFontSizeMultiplier =
  Settings.MAX_FONT_SIZE_MULTIPLIER;
AnimateableText.defaultProps = AnimateableText.defaultProps || {};
AnimateableText.defaultProps.maxFontSizeMultiplier =
  Settings.MAX_FONT_SIZE_MULTIPLIER;

if (__DEV__) {
  LogBox.ignoreLogs([
    '[Reanimated] Tried to modify key `current` of an object which has been already passed to a worklet.',
    'There was a problem with the store.',
  ]);
}

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
  const theme = React.useMemo(() => ({ colorScheme }), [colorScheme]);
  React.useEffect(() => {
    // hide splash screen after storage restore
    Helper.debug(
      '👌 Application loading is completed',
      Date.now() - start_time,
    );
    SplashScreen.hideAsync().catch(console.warn);
  }, []);
  const windowDimensions = useWindowDimensions();
  React.useEffect(() => {
    if (!_.isEqual(windowDimensions, Settings.windowDimensions)) {
      // handle screen size or font scale changes
      Helper.debug('🌀 Screen size or scales were updated');
      // FIXME: should stop using fixed sizes to avoid application reloading
      reloadAppAsync();
    }
  }, [windowDimensions]);
  return (
    <ThemeProvider theme={theme}>
      <ActionSheetProvider>
        <HeaderButtonsProvider stackType="native">
          <AppContainer />
        </HeaderButtonsProvider>
      </ActionSheetProvider>
    </ThemeProvider>
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
    <SafeAreaProvider
      // https://github.com/software-mansion/react-native-screens/issues/1276#issuecomment-1156710669
      {...(Platform.OS === 'ios' && {
        initialMetrics: initialWindowMetrics,
      })}
    >
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
