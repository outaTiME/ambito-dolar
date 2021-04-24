import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import {
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons';
import { useFonts } from '@use-expo/font';
import * as Amplitude from 'expo-analytics-amplitude';
import AppLoading from 'expo-app-loading';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Text, TextInput, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';
import { createMigrate, persistReducer } from 'redux-persist';
import ExpoFileSystemStorage from 'redux-persist-expo-filesystem';
import { createBlacklistFilter } from 'redux-persist-transform-filter';
import thunk from 'redux-thunk';
import { ThemeProvider } from 'styled-components';

import AppContainer from './components/AppContainer';
import Settings from './config/settings';
import reducers from './reducers';
import Helper from './utilities/Helper';
import Sentry from './utilities/Sentry';

if (Helper.isDev()) {
  LogBox.ignoreLogs([
    // disable warning of firebase on android
    'Setting a timer for a long period of time',
    'Amplitude client has not been initialized',
    'Constants.installationId has been deprecated in favor of generating and storing your own ID.',
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

const STORE_CONFIG_VERSION = 5;

const migrations = {
  [STORE_CONFIG_VERSION]: ({ application: { notification_settings } }) => ({
    application: {
      notification_settings,
    },
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

const composeEnhancers = composeWithDevTools({
  // specify name here, actionsBlacklist, actionsCreators and other options if needed
});

const store = createStore(
  reducer,
  initialState,
  composeEnhancers(...enhacers, applyMiddleware(...middlewares))
);

// disable font scaling in whole app (iOS only)
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = Settings.ALLOW_FONT_SCALING;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.allowFontScaling = Settings.ALLOW_FONT_SCALING;

export default function App() {
  const [dataLoaded] = Helper.usePersistedData(store);
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
    ...FontAwesome5.font,
    'FiraGO-Regular': require('./assets/fonts/FiraGO-Regular-Minimal.otf'),
    // 'SF-Pro-Rounded-Regular': require('./assets/fonts/SF-Pro-Rounded-Regular.otf'),
  });
  const colorScheme = Helper.useColorScheme();
  const theme = React.useMemo(() => ({ colorScheme }), [colorScheme]);
  if (!dataLoaded || !fontsLoaded) {
    return <AppLoading />;
  }
  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <StatusBar style="auto" animated />
        <Provider store={store}>
          <ActionSheetProvider>
            <AppContainer />
          </ActionSheetProvider>
        </Provider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
