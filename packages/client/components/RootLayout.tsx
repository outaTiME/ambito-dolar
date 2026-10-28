// https://docs.expo.dev/develop/development-builds/use-development-builds/#add-error-handling
import 'expo-dev-client';
import { NavigationBar } from 'expo-navigation-bar';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import {
  Appearance,
  Dimensions,
  Platform,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from 'styled-components';

import AppContainer from '@/components/AppContainer';
import ToastOverlay from '@/components/ToastOverlay';
import Settings from '@/config/settings';
import useNavigationTrackingRouter from '@/hooks/app/useNavigationTrackingRouter';
import useNotificationTapRouter from '@/hooks/app/useNotificationTapRouter';
import useQuickActionsRouter from '@/hooks/app/useQuickActionsRouter';
import useColorScheme from '@/hooks/useColorScheme';
import { store, persistor } from '@/store';
import Helper from '@/utilities/Helper';
import Sentry from '@/utilities/Sentry';

const start_time = Date.now();
SplashScreen.preventAutoHideAsync().catch(console.warn);
SplashScreen.setOptions({ fade: true });

// leaf component to isolate useSegments subscription away from ThemedLayout
// prevents the whole app tree from re-rendering on every URL change
const NavigationTracker = () => {
  useNavigationTrackingRouter();
  return null;
};

// phones stay portrait like the iphone, tablets rotate like the ipad
// a foldable is both, so the lock follows the current display and not the device
// not the window, a lock letterboxes it below 600 on android before 16 and never unlocks
const isCompactScreen = () => {
  const { width, height } = Dimensions.get('screen');
  return Math.min(width, height) < 600;
};

// the first lock runs behind the splash, the leaf below follows a fold
if (Platform.OS === 'android' && isCompactScreen()) {
  ScreenOrientation.lockAsync(
    ScreenOrientation.OrientationLock.PORTRAIT_UP,
  ).catch(console.warn);
}

// a leaf, a resize must not re-render ThemedLayout
const ScreenOrientationLock = () => {
  // only re-renders on a change, the display size comes from screen
  useWindowDimensions();
  const isCompact = isCompactScreen();
  React.useEffect(() => {
    (isCompact
      ? ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        )
      : ScreenOrientation.unlockAsync()
    ).catch(console.warn);
  }, [isCompact]);
  return null;
};

const ThemedLayout = () => {
  const colorScheme = useColorScheme();
  const theme = React.useMemo(() => ({ colorScheme }), [colorScheme]);
  const navigationTheme = React.useMemo(() => {
    const isDark = colorScheme === 'dark';
    const baseTheme = isDark ? NavigationDarkTheme : NavigationDefaultTheme;
    return {
      ...baseTheme,
      dark: isDark,
      colors: {
        ...baseTheme.colors,
        // the screens color, a transition shows it behind them
        background: Settings.getBackgroundColor(colorScheme),
        card: Settings.getContentColor(colorScheme),
        border: Settings.getSeparatorColor(colorScheme),
      },
    };
  }, [colorScheme]);
  useNotificationTapRouter();
  useQuickActionsRouter();
  React.useEffect(() => {
    Helper.debug(
      '👌 Application loading is completed',
      Date.now() - start_time,
    );
  }, []);
  // bridge redux appearance to native chrome (iOS UIKit, Android AppCompat)
  const appearance = useSelector((state: any) => state.application.appearance);
  React.useEffect(() => {
    Appearance.setColorScheme(appearance ?? 'unspecified');
  }, [appearance]);
  // explicit style follows the rendered scheme instead of the Appearance cache
  React.useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    NavigationBar.setStyle(Helper.getInvertedTheme(colorScheme));
  }, [colorScheme]);
  // the root lays out empty and a layout event only means yoga measured
  const splashHiddenRef = React.useRef(false);
  const onContentLayout = React.useCallback(() => {
    if (!splashHiddenRef.current) {
      splashHiddenRef.current = true;
      // expo-router hides on its own readiness, the content lays out later
      requestAnimationFrame(() => {
        SplashScreen.hideAsync().catch(console.warn);
      });
    }
  }, []);
  // set background color early to avoid white flash on Android
  const backgroundColor = Settings.getBackgroundColor(colorScheme, true);
  const stackScreenOptions = React.useMemo(
    () => ({
      headerShown: false,
      statusBarStyle: Helper.getInvertedTheme(colorScheme) as 'dark' | 'light',
    }),
    [colorScheme],
  );
  return (
    <View style={{ flex: 1, backgroundColor }} onLayout={onContentLayout}>
      {/* outside AppContainer, the initial screen waits for the rates */}
      {Platform.OS === 'android' && <ScreenOrientationLock />}
      <ThemeProvider theme={theme}>
        <NavigationThemeProvider value={navigationTheme}>
          <AppContainer>
            <Stack screenOptions={stackScreenOptions}>
              <Stack.Screen
                name="(tabs)"
                options={{
                  // the index redirect replaces into this screen after the first commit since router 58
                  animation: 'none',
                }}
              />
              <Stack.Screen
                name="(modals)"
                options={{
                  presentation: 'modal',
                  gestureEnabled: false,
                }}
              />
              <Stack.Screen
                name="donate"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: 'fitToContents',
                  // the sheet surface spans the window, the card draws the shape
                  sheetElevation: 0,
                  // forced light, android stays transparent so the card radius shows
                  contentStyle: {
                    backgroundColor:
                      Platform.OS === 'android'
                        ? 'transparent'
                        : Settings.getContentColor('light'),
                  },
                }}
              />
            </Stack>
            <NavigationTracker />
            <ToastOverlay />
          </AppContainer>
        </NavigationThemeProvider>
      </ThemeProvider>
    </View>
  );
};

const RootLayout = () => {
  const isReady = Helper.useApplicationConstants();
  if (!isReady) {
    return null;
  }
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView>
          <ThemedLayout />
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
};

export default Sentry.wrap(RootLayout);
