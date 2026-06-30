// https://docs.expo.dev/develop/development-builds/use-development-builds/#add-error-handling
import 'expo-dev-client';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router/react-navigation';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { Appearance, Platform, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from 'styled-components';

import AppContainer from '@/components/AppContainer';
import ToastOverlay from '@/components/ToastOverlay';
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
SplashScreen.setOptions({ fade: true });

// leaf component to isolate usePathname subscription away from ThemedLayout
// prevents the whole app tree from re-rendering on every URL change
const NavigationTracker = () => {
  useNavigationTrackingRouter();
  return null;
};

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
  const theme = React.useMemo(() => ({ colorScheme }), [colorScheme]);
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
  const windowDimensions = useWindowDimensions();
  const [layoutKey, setLayoutKey] = React.useState(null);
  React.useEffect(() => {
    Helper.debug(
      '👌 Application loading is completed',
      Date.now() - start_time,
    );
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
  // bridge redux appearance to native chrome (iOS UIKit, Android AppCompat)
  const appearance = useSelector((state: any) => state.application.appearance);
  React.useEffect(() => {
    Appearance.setColorScheme(appearance ?? 'unspecified');
  }, [appearance]);
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
    <View style={{ flex: 1, backgroundColor }}>
      {layoutKey && (
        <ThemeProvider theme={theme}>
          <NavigationThemeProvider value={navigationTheme}>
            <BottomSheetModalProvider>
              <AppContainer>
                <Stack key={layoutKey} screenOptions={stackScreenOptions}>
                  <Stack.Screen name="(tabs)" />
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
                      headerShown: false,
                      sheetAllowedDetents: 'fitToContents',
                      sheetGrabberVisible: true,
                      gestureEnabled: true,
                      // forced light to match the prior gorhom modal
                      // android stays transparent so the inner view corner radius shows
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
            </BottomSheetModalProvider>
          </NavigationThemeProvider>
        </ThemeProvider>
      )}
    </View>
  );
};

const RootLayout = () => {
  const isReady = Helper.useApplicationConstants();
  const onLayoutRootView = React.useCallback(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [isReady]);
  if (!isReady) {
    return null;
  }
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView onLayout={onLayoutRootView}>
          <ThemedLayout />
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
};

export default Sentry.wrap(RootLayout);
