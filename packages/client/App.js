import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import {
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons';
import * as Amplitude from 'expo-analytics-amplitude';
import AppLoading from 'expo-app-loading';
import { useAssets } from 'expo-asset';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Text, TextInput, LogBox, AppState } from 'react-native';
import { RootSiblingParent } from 'react-native-root-siblings';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, compose } from 'redux';
import { createMigrate, persistReducer } from 'redux-persist';
import ExpoFileSystemStorage from 'redux-persist-expo-filesystem';
import { createBlacklistFilter } from 'redux-persist-transform-filter';
import thunk from 'redux-thunk';
import { ThemeProvider } from 'styled-components';
import { SWRConfig } from 'swr';

import AppContainer from './components/AppContainer';
import Settings from './config/settings';
import useColorScheme from './hooks/useColorScheme';
import reducers from './reducers';
import Helper from './utilities/Helper';
import Sentry from './utilities/Sentry';

if (__DEV__) {
  LogBox.ignoreLogs([
    'Amplitude client has not been initialized',
    'Constants.installationId has been deprecated',
    'Found screens with the same name nested inside one another',
  ]);
} else {
  Sentry.configure(Settings.SENTRY_URI);
  Amplitude.initializeAsync(Settings.AMPLITUDE_KEY).catch(() => {
    // silent ignore when error
  });
}

const saveApplicationSubsetBlacklistFilter = createBlacklistFilter(
  'application',
  ['push_token', 'sending_push_token']
);

const STORE_CONFIG_VERSION = 6;

const migrations = {
  [STORE_CONFIG_VERSION]: ({ application }) => ({
    application,
  }),
};

const persistConfig = {
  key: 'root',
  storage: ExpoFileSystemStorage,
  debug: __DEV__,
  version: STORE_CONFIG_VERSION,
  migrate: createMigrate(migrations, { debug: __DEV__ }),
  transforms: [saveApplicationSubsetBlacklistFilter],
};

const reducer = persistReducer(persistConfig, reducers);

const initialState = {
  // pass
};

const middlewares = [thunk];

const enhacers = [
  // pass
];

const store = createStore(
  reducer,
  initialState,
  compose(...enhacers, applyMiddleware(...middlewares))
);

// disable font scaling in whole app (iOS only)
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = Settings.ALLOW_FONT_SCALING;
Text.defaultProps.maxFontSizeMultiplier = 1;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.allowFontScaling = Settings.ALLOW_FONT_SCALING;
TextInput.defaultProps.maxFontSizeMultiplier = 1;

const ThemedApp = () => {
  const colorScheme = useColorScheme();
  const theme = React.useMemo(() => ({ colorScheme }), [colorScheme]);
  const statusBarStyle = colorScheme
    ? Helper.getInvertedTheme(colorScheme)
    : 'auto';
  return (
    <ThemeProvider theme={theme}>
      <StatusBar style={statusBarStyle} animated />
      <RootSiblingParent>
        <ActionSheetProvider>
          <AppContainer />
        </ActionSheetProvider>
      </RootSiblingParent>
    </ThemeProvider>
  );
};

const App = () => {
  const dataLoaded = Helper.usePersistedData(store);
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
  if (!dataLoaded || !assetsLoaded || !fontsLoaded || !constantsLoaded) {
    return <AppLoading />;
  }
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <ThemedApp />
      </Provider>
    </SafeAreaProvider>
  );
};

export default () => (
  <SWRConfig
    value={{
      provider: () => new Map(),
      isVisible: () => {
        return true;
      },
      initFocus(callback) {
        let appState = AppState.currentState;
        const onAppStateChange = (nextAppState) => {
          if (
            appState.match(/inactive|background/) &&
            nextAppState === 'active'
          ) {
            console.log('>>> SWR (initFocus) active');
            callback();
          }
          appState = nextAppState;
        };
        const subscription = AppState.addEventListener(
          'change',
          onAppStateChange
        );
        return () => {
          subscription.remove();
        };
      },
      /* isOnline() {
          return true;
        },
        initReconnect(callback) {
          let networkState = true;
          return Network.addEventListener((nextNetworkstate) => {
            if (
              networkState === false &&
              nextNetworkstate.isConnected &&
              nextNetworkstate.isInternetReachable
            ) {
              callback();
            }
            networkState =
              nextNetworkstate.isConnected &&
              nextNetworkstate.isInternetReachable;
          });
        }, */
      // fetcher: (resource, opts) => Helper.getJson(resource, opts),
    }}
  >
    <App />
  </SWRConfig>
);
