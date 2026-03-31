// https://docs.expo.dev/develop/development-builds/use-development-builds/#add-error-handling
import 'expo-dev-client';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import {
  Text,
  TextInput,
  Platform,
  useWindowDimensions,
  View,
} from 'react-native';
import AnimateableText from 'react-native-animateable-text/lib/commonjs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from 'styled-components';

import AppContainer from '@/components/AppContainer';
import Settings, { updateSettings } from '@/config/settings';
import useNavigationTrackingRouter from '@/hooks/app/useNavigationTrackingRouter';
import useNotificationTapRouter from '@/hooks/app/useNotificationTapRouter';
import useQuickActionsRouter from '@/hooks/app/useQuickActionsRouter';
import useColorScheme from '@/hooks/useColorScheme';
import { store, persistor } from '@/store';
import Helper from '@/utilities/Helper';
import Sentry from '@/utilities/Sentry';

const start_time = Date.now();
SplashScreen.preventAutoHideAsync().catch(console.warn);
SplashScreen.setOptions({
  fade: true,
});

const TextComponent = Text as any;
const TextInputComponent = TextInput as any;
const AnimateableTextComponent = AnimateableText as any;

TextComponent.defaultProps = TextComponent.defaultProps || {};
TextComponent.defaultProps.maxFontSizeMultiplier =
  Settings.MAX_FONT_SIZE_MULTIPLIER;
TextInputComponent.defaultProps = TextInputComponent.defaultProps || {};
TextInputComponent.defaultProps.maxFontSizeMultiplier =
  Settings.MAX_FONT_SIZE_MULTIPLIER;
AnimateableTextComponent.defaultProps =
  AnimateableTextComponent.defaultProps || {};
AnimateableTextComponent.defaultProps.maxFontSizeMultiplier =
  Settings.MAX_FONT_SIZE_MULTIPLIER;

if (Platform.OS === 'android') {
  // force landscape on tablets
  ScreenOrientation.lockAsync(
    Settings.IS_TABLET
      ? ScreenOrientation.OrientationLock.LANDSCAPE
      : ScreenOrientation.OrientationLock.PORTRAIT_UP,
  ).catch(console.warn);
}

const ThemedLayout = () => {
  const colorScheme = useColorScheme();
  const theme = { colorScheme };
  const navigationTheme = React.useMemo(() => {
    const isDark = colorScheme === 'dark';
    const baseTheme = isDark ? NavigationDarkTheme : NavigationDefaultTheme;
    return {
      ...baseTheme,
      dark: isDark,
      colors: {
        ...baseTheme.colors,
        card: Settings.getContentColor(colorScheme),
        border: Settings.getSeparatorColor(colorScheme),
      },
    };
  }, [colorScheme]);
  useNotificationTapRouter();
  useQuickActionsRouter();
  useNavigationTrackingRouter();
  const windowDimensions = useWindowDimensions();
  const [layoutKey, setLayoutKey] = React.useState(null);
  React.useEffect(() => {
    Helper.debug(
      '👌 Application loading is completed',
      Date.now() - start_time,
    );
    SplashScreen.hideAsync().catch(console.warn);
  }, []);
  React.useEffect(() => {
    Helper.debug(
      '🌀 Layout change detected, resetting app layout',
      windowDimensions,
    );
    updateSettings(windowDimensions);
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
          <NavigationThemeProvider value={navigationTheme}>
            <ActionSheetProvider>
              <BottomSheetModalProvider>
                <AppContainer>
                  <Stack
                    key={layoutKey}
                    screenOptions={{
                      headerShown: false,
                      statusBarStyle: Helper.getInvertedTheme(colorScheme),
                      navigationBarColor: Settings.getContentColor(colorScheme),
                    }}
                    // initialRouteName="(tabs)"
                  >
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                      name="(modals)"
                      options={{
                        presentation: 'modal',
                        gestureEnabled: false,
                      }}
                    />
                  </Stack>
                </AppContainer>
              </BottomSheetModalProvider>
            </ActionSheetProvider>
          </NavigationThemeProvider>
        </ThemeProvider>
      )}
    </View>
  );
};

const RootLayout = () => {
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
            <ThemedLayout />
          </GestureHandlerRootView>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
};

export default Sentry.wrap(RootLayout);
