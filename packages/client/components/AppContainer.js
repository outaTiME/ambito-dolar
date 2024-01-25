import AmbitoDolar from '@ambito-dolar/core';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { compose } from '@reduxjs/toolkit';
import { BlurView } from 'expo-blur';
import * as Device from 'expo-device';
import * as Linking from 'expo-linking';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as StoreReview from 'expo-store-review';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import React from 'react';
import { StyleSheet, Platform, View, DeviceEventEmitter } from 'react-native';
import Purchases from 'react-native-purchases';
import QuickActions from 'react-native-quick-actions';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';

import { MaterialHeaderButtons, Item } from './HeaderButtons';
import withContainer from './withContainer';
import withRates from './withRates';
import * as actions from '../actions';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import useAppState from '../hooks/useAppState';
import * as WidgetKit from '../modules/widgetkit';
import AboutScreen from '../screens/AboutScreen';
import AdvancedNotificationsScreen from '../screens/AdvancedNotificationsScreen';
import AppearanceScreen from '../screens/AppearanceScreen';
import ConversionScreen from '../screens/ConversionScreen';
import CustomizeRatesScreen from '../screens/CustomizeRatesScreen';
import DeveloperScreen from '../screens/DeveloperScreen';
import InitialScreen from '../screens/InitialScreen';
import MainScreen from '../screens/MainScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import RateDetailScreen from '../screens/RateDetailScreen';
import RateOrderScreen from '../screens/RateOrderScreen';
import RateRawDetailScreen from '../screens/RateRawDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import UpdateAppScreen from '../screens/UpdateAppScreen';
import Amplitude from '../utilities/Amplitude';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';
import Sentry from '../utilities/Sentry';

const BackButton = ({ navigation, popToTop = false }) => (
  <MaterialHeaderButtons>
    <Item
      title="Atras"
      iconName="arrow-back"
      onPress={popToTop === true ? navigation.popToTop : navigation.goBack}
    />
  </MaterialHeaderButtons>
);

const DoneButton = ({ navigation, popToTop = false }) => {
  const { fonts } = Helper.useTheme();
  return (
    <MaterialHeaderButtons>
      <Item
        title="Listo"
        onPress={popToTop === true ? navigation.popToTop : navigation.goBack}
        buttonStyle={{
          ...fonts.body,
        }}
      />
    </MaterialHeaderButtons>
  );
};

// for market capture purposes
const BLUR_EFFECT_ON_NAVIGATION_BARS = true;

const NavigatorBackgroundView = ({ style }) => {
  const { theme } = Helper.useTheme();
  const { colors } = useTheme();
  if (!BLUR_EFFECT_ON_NAVIGATION_BARS || Platform.OS === 'android') {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.card,
          },
          style,
        ]}
      />
    );
  }
  return (
    <BlurView
      // use light (default) instead of extraLight (light)
      // https://github.com/expo/expo/blob/main/packages/expo-blur/ios/EXBlur/BlurEffectView.swift#L52
      tint={theme === 'light' ? 'default' : theme}
      intensity={100}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
};

const useNavigatorScreenOptions = (modal = false) => {
  const { theme, fonts } = Helper.useTheme();
  const headerBackground = React.useCallback(
    () => <NavigatorBackgroundView />,
    [],
  );
  return {
    headerBackVisible: false,
    headerShadowVisible: false,
    headerTitleAlign: 'center',
    headerTitleStyle: fonts.title,
    ...Platform.select({
      ios: {
        ...(!BLUR_EFFECT_ON_NAVIGATION_BARS
          ? { headerBackground }
          : {
              headerBlurEffect: modal
                ? `systemMaterial${AmbitoDolar.getCapitalized(theme)}`
                : theme,
            }),
        headerTransparent: true,
      },
      android: {
        // doesn't work correctly on android
        // headerBackground,
      },
    }),
  };
};

const RatesStack = createNativeStackNavigator();
const RatesStackScreen = () => {
  const navigatorScreenOptions = useNavigatorScreenOptions();
  return (
    <RatesStack.Navigator screenOptions={navigatorScreenOptions}>
      <RatesStack.Screen
        name={Settings.INITIAL_ROUTE_NAME}
        options={{
          title: Helper.getScreenTitle(Settings.APP_NAME),
        }}
        component={MainScreen}
      />
      <RatesStack.Screen
        name="RateDetail"
        options={({ route: { params }, navigation }) => ({
          title: Helper.getScreenTitle(AmbitoDolar.getRateTitle(params.type)),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={RateDetailScreen}
      />
      <RatesStack.Screen
        name="RateRawDetail"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('detail')),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={RateRawDetailScreen}
      />
    </RatesStack.Navigator>
  );
};

const ConversionStack = createNativeStackNavigator();
const ConversionStackScreen = () => {
  const navigatorScreenOptions = useNavigatorScreenOptions();
  return (
    <ConversionStack.Navigator screenOptions={navigatorScreenOptions}>
      <ConversionStack.Screen
        name="Conversion"
        options={{
          title: Helper.getScreenTitle(I18n.t('conversion')),
        }}
        component={ConversionScreen}
      />
    </ConversionStack.Navigator>
  );
};

const SettingsStack = createNativeStackNavigator();
const SettingsStackScreen = () => {
  const navigatorScreenOptions = useNavigatorScreenOptions();
  const [allowNotifications] = Helper.useSharedState('allowNotifications');
  return (
    <SettingsStack.Navigator screenOptions={navigatorScreenOptions}>
      <SettingsStack.Screen
        name="Settings"
        options={{
          title: Helper.getScreenTitle(I18n.t('settings')),
        }}
        component={SettingsScreen}
      />
      <SettingsStack.Screen
        name="Notifications"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('notifications')),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={NotificationsScreen}
      />
      {(!Device.isDevice || allowNotifications) && (
        <SettingsStack.Screen
          name="AdvancedNotifications"
          options={({ route: { params }, navigation }) => ({
            title: Helper.getScreenTitle(
              AmbitoDolar.getNotificationTitle(params.type),
            ),
            headerLeft: () => <BackButton {...{ navigation }} />,
          })}
          component={AdvancedNotificationsScreen}
        />
      )}
      <SettingsStack.Screen
        name="Developer"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('developer')),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={DeveloperScreen}
      />
      <SettingsStack.Screen
        name="About"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('about')),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={AboutScreen}
      />
      <SettingsStack.Screen
        name="Statistics"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('statistics')),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={StatisticsScreen}
      />
      <SettingsStack.Screen
        name="Appearance"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('appearance')),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={AppearanceScreen}
      />
      <SettingsStack.Screen
        name="CustomizeRates"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('customize_rates')),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={CustomizeRatesScreen}
      />
      <SettingsStack.Screen
        name="RateOrder"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('rate_order')),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={RateOrderScreen}
      />
    </SettingsStack.Navigator>
  );
};

const Tab = createBottomTabNavigator();
const MainStackScreen = () => {
  const { theme } = Helper.useTheme();
  const tabBarBackground = React.useCallback(
    () => <NavigatorBackgroundView />,
    [],
  );
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Settings.getForegroundColor(theme),
        tabBarInactiveTintColor: Settings.getStrokeColor(theme),
        // tabBarAllowFontScaling: Settings.ALLOW_FONT_SCALING,
        tabBarStyle: {
          ...(Platform.OS === 'ios' && {
            position: 'absolute',
          }),
          // https://github.com/react-navigation/react-navigation/blob/main/packages/bottom-tabs/src/views/BottomTabBar.tsx#L382
          borderTopWidth: 0,
          elevation: 0,
        },
        ...Platform.select({
          ios: {
            tabBarBackground,
          },
          android: {
            // doesn't work correctly on android
            // tabBarBackground,
          },
        }),
      }}
    >
      <Tab.Screen
        name="RatesTab"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="cards-outline"
              color={color}
              size={size}
            />
          ),
          // https://github.com/react-navigation/react-navigation/issues/10175#issuecomment-1630642097
          // lazy: false,
        }}
        component={RatesStackScreen}
      />
      <Tab.Screen
        name="ConversionTab"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="filter-outline"
              color={color}
              size={size}
            />
          ),
        }}
        component={ConversionStackScreen}
        listeners={({ navigation, route }) => ({
          tabLongPress: () => {
            navigation.navigate(route.name, {
              screen: 'Conversion',
              params: {
                focus: true,
              },
            });
          },
        })}
      />
      <Tab.Screen
        name="SettingsTab"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="cog-outline"
              color={color}
              size={size}
            />
          ),
        }}
        component={SettingsStackScreen}
      />
    </Tab.Navigator>
  );
};

const ModalsStack = createNativeStackNavigator();
const ModalsStackScreen = () => {
  const navigatorScreenOptions = useNavigatorScreenOptions(true);
  return (
    <ModalsStack.Navigator screenOptions={navigatorScreenOptions}>
      <ModalsStack.Screen
        name="CustomizeRates"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('customize_rates')),
          ...Platform.select({
            ios: {
              headerRight: () => <DoneButton {...{ navigation }} />,
            },
            android: {
              headerLeft: () => <BackButton {...{ navigation }} />,
            },
          }),
        })}
        component={CustomizeRatesScreen}
      />
      <ModalsStack.Screen
        name="RateOrder"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('rate_order')),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={RateOrderScreen}
      />
    </ModalsStack.Navigator>
  );
};

let initialQuickAction;
// https://github.com/jordanbyron/react-native-quick-actions#listening-for-quick-actions
Settings.IS_PRODUCTION &&
  QuickActions.popInitialAction()
    .then((data) => (initialQuickAction = data))
    .catch(console.warn);

const RootStack = createNativeStackNavigator();
const AppContainer = ({
  rates,
  rateTypes,
  loadingError,
  stillLoading,
  fetchRates,
  showAppUpdateMessage,
}) => {
  const { theme } = Helper.useTheme();
  const trackScreen = React.useCallback((name) => {
    if (__DEV__) {
      console.log('👀 Track screen', name);
    }
    Sentry.addBreadcrumb({
      message: `${name} screen`,
    });
    Amplitude.track(`${name} screen`);
  }, []);
  React.useEffect(() => {
    const uid = Settings.INSTALLATION_ID;
    // use same device identifier for better association
    Sentry.setUserContext({
      id: uid,
    });
    Amplitude.setUserId(uid);
    // track initial screen
    trackScreen(Settings.INITIAL_ROUTE_NAME);
  }, []);
  // https://reactnavigation.org/docs/screen-tracking
  const navigationRef = Helper.getNavigationContainerRef();
  const routeNameRef = React.useRef();
  // NOTIFICATIONS (user interaction)
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  React.useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.actionIdentifier ===
        Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      Amplitude.track('Select notification');
      navigationRef.navigate('RatesTab', {
        screen: Settings.INITIAL_ROUTE_NAME,
      });
    }
  }, [lastNotificationResponse]);
  // QUICK ACTIONS
  const onQuickAction = React.useCallback((data) => {
    if (__DEV__) {
      console.log('🎯 Quick action received', data);
    }
    const type = data?.type;
    if (type) {
      Amplitude.track('Quick action', { type });
      navigationRef.navigate(`${type}Tab`, {
        screen: type,
        params: {
          focus: true,
        },
      });
    }
  }, []);
  React.useEffect(() => {
    // handle cold launch
    initialQuickAction && onQuickAction(initialQuickAction);
    const subscription = DeviceEventEmitter.addListener(
      'quickActionShortcut',
      onQuickAction,
    );
    return () => {
      subscription.remove();
    };
  }, []);
  // DEEP LINK
  const onDeepLink = React.useCallback((url) => {
    if (url) {
      const { hostname: route, queryParams: params } = Linking.parse(url);
      if (__DEV__) {
        console.log('🎯 Deep link received', url, route, params);
      }
      if (/^rates?$/i.test(route)) {
        navigationRef.navigate('RatesTab', {
          screen:
            !params.type || !rateTypes.includes(params.type)
              ? Settings.INITIAL_ROUTE_NAME
              : 'RateDetail',
          params,
          // https://reactnavigation.org/docs/nesting-navigators/#rendering-initial-route-defined-in-the-navigator
          initial: false,
        });
      }
    }
  }, []);
  // https://github.com/expo/expo/blob/main/packages/expo-linking/src/Linking.ts#L365
  React.useEffect(() => {
    Linking.getInitialURL().then(onDeepLink);
    const subscription = Linking.addEventListener('url', ({ url }) =>
      onDeepLink(url),
    );
    return () => subscription.remove();
  }, []);
  const onReady = React.useCallback(() => {
    // https://reactnavigation.org/docs/navigating-without-navigation-prop/#handling-initialization
    routeNameRef.current = navigationRef.getCurrentRoute().name;
    // wait a while to avoid flickering
    Helper.delay(Settings.ANIMATION_DURATION).then(() => {
      if (__DEV__) {
        console.log('👌 Application loading is completed');
      }
      return SplashScreen.hideAsync().catch(console.warn);
    });
  }, []);
  const onStateChange = React.useCallback(() => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.getCurrentRoute().name;
    if (previousRouteName !== currentRouteName) {
      trackScreen(currentRouteName);
    }
    // save the current route name for later comparision
    routeNameRef.current = currentRouteName;
  }, []);
  const navigationTheme = React.useMemo(
    () => ({
      dark: theme === 'dark',
      colors: {
        card: Settings.getContentColor(theme),
        border: Settings.getSeparatorColor(theme),
      },
    }),
    [theme],
  );
  const navigatorScreenOptions = useNavigatorScreenOptions();
  const statusBarStyle = Helper.getInvertedTheme(theme);
  const hasRates = React.useMemo(() => Helper.isValid(rates), [rates]);
  /* const linking = React.useMemo(
    () => ({
      prefixes: [Linking.createURL('/')],
      config: {
        // initialRouteName: Settings.INITIAL_ROUTE_NAME,
        screens: {
          [Settings.INITIAL_ROUTE_NAME]: {
            // initialRouteName: 'RatesTab',
            screens: {
              RatesTab: {
                initialRouteName: Settings.INITIAL_ROUTE_NAME,
                screens: {
                  [Settings.INITIAL_ROUTE_NAME]: 'rates',
                  // FIXME: handle invalid types
                  RateDetail: 'rate/:type',
                },
              },
            },
          },
        },
      },
    }),
    []
  ); */
  return (
    <NavigationContainer
      {...{
        ref: navigationRef,
        onReady,
        onStateChange,
        theme: navigationTheme,
        // linking,
      }}
    >
      <RootStack.Navigator
        screenOptions={{
          ...navigatorScreenOptions,
          headerShown: false,
          statusBarStyle,
          statusBarTranslucent: true,
        }}
      >
        {!hasRates ? (
          <RootStack.Screen name={Settings.INITIAL_ROUTE_NAME}>
            {(props) => (
              <InitialScreen
                {...{
                  rates,
                  loadingError,
                  stillLoading,
                  fetchRates,
                  ...props,
                }}
              />
            )}
          </RootStack.Screen>
        ) : showAppUpdateMessage ? (
          <RootStack.Screen
            name={Settings.INITIAL_ROUTE_NAME}
            component={UpdateAppScreen}
          />
        ) : (
          <>
            <RootStack.Screen
              name={Settings.INITIAL_ROUTE_NAME}
              component={MainStackScreen}
            />
            <RootStack.Screen
              name="Modals"
              component={ModalsStackScreen}
              options={{
                // works only on iOS
                gestureEnabled: false,
                presentation: 'modal',
              }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const firebaseApp =
  Settings.FIREBASE_CONFIG_JSON &&
  initializeApp(JSON.parse(Settings.FIREBASE_CONFIG_JSON));

const withRealtime = (Component) => (props) => {
  const rates = props.rates;
  const isInitial = !rates;
  const dispatch = useDispatch();
  const [, setUpdatingRates] = Helper.useSharedState('updatingRates');
  const [error, setError] = React.useState(false);
  const [stillLoading, setStillLoading] = React.useState(false);
  const fetchRates = React.useCallback(
    (initial) => {
      if (__DEV__) {
        console.log('💫 Fetching rates', initial);
      }
      !initial && setUpdatingRates(true);
      setError(false);
      setStillLoading(false);
      const timer_id = setTimeout(() => {
        setStillLoading(true);
      }, Settings.STILL_LOADING_TIMEOUT);
      return Helper.getRates(initial)
        .then((data) => {
          dispatch(actions.addRates(data));
          dispatch(actions.registerApplicationDownloadRates());
          // force reload of widgets
          WidgetKit.reloadAllTimelines();
        })
        .catch(() => {
          setError(true);
        })
        .finally(() => {
          !initial && setUpdatingRates(false);
          clearTimeout(timer_id);
        });
    },
    [dispatch],
  );
  // UPDATE CHECK
  const updatedAt = useSelector((state) => state.rates.updated_at);
  const updatedAtRef = React.useRef();
  React.useEffect(() => {
    updatedAtRef.current = updatedAt;
  }, [updatedAt]);
  React.useEffect(() => {
    if (!isInitial) {
      if (firebaseApp) {
        if (__DEV__) {
          console.log('🚀 Connect to firebase');
        }
        const db = getDatabase(firebaseApp);
        return onValue(ref(db, '/u'), (snapshot) => {
          if (!snapshot.exists()) {
            // this should never happen
            console.error('No data available on firebase');
            return;
          }
          const data = snapshot.val();
          // use rates file format
          const updated_at = AmbitoDolar.getTimezoneDate(data * 1000).format();
          Sentry.addBreadcrumb({
            message: 'Firebase update event',
            data: updated_at,
          });
          if (__DEV__) {
            console.log(
              '⚡️ Firebase updated',
              updated_at,
              updatedAtRef.current,
            );
          }
          if (updated_at !== updatedAtRef.current) {
            fetchRates(false);
          } else {
            if (__DEV__) {
              console.log('Rates already updated', updated_at);
            }
          }
        });
      }
      if (__DEV__) {
        console.log('❄️ No realtime updates');
      }
    } else {
      if (__DEV__) {
        console.log('🚀 Initial fetch');
      }
      fetchRates(true);
    }
  }, [isInitial]);
  return (
    <Component
      {...{
        loadingError: error,
        stillLoading,
        fetchRates,
        ...props,
      }}
    />
  );
};

const withAppUpdateCheck = (Component) => (props) => {
  const { version, invalidVersion, ignoreUpdate } = useSelector(
    ({
      application: {
        version,
        invalid_version: invalidVersion,
        ignore_update: ignoreUpdate,
      },
    }) => ({
      version,
      invalidVersion,
      ignoreUpdate,
    }),
    shallowEqual,
  );
  const dispatch = useDispatch();
  let shouldIgnoreUpdate = false;
  if (invalidVersion === true && ignoreUpdate) {
    // check if expired
    shouldIgnoreUpdate =
      ignoreUpdate + Settings.APP_IGNORE_UPDATE_EXPIRATION >= Date.now();
  }
  const showAppUpdateMessage =
    invalidVersion &&
    shouldIgnoreUpdate === false &&
    // prevents app update message after version upgrade
    version &&
    version === Settings.APP_VERSION;
  React.useEffect(() => {
    if (Settings.APP_VERSION !== version) {
      if (__DEV__) {
        console.log('Application updated', Settings.APP_VERSION, version);
      }
      // clean invalid_version and ignore_update flag
      dispatch(actions.registerApplicationUpdate(Settings.APP_VERSION));
    }
  }, [dispatch, version]);
  return <Component showAppUpdateMessage={showAppUpdateMessage} {...props} />;
};

const withAppStatistics = (Component) => (props) => {
  const isActiveAppState = useAppState('active');
  const dispatch = useDispatch();
  // TODO: how to handle local store cleaning (use last_day_used / days_used / usages ?)
  const tickCallback = React.useCallback(() => {
    if (isActiveAppState) {
      dispatch(actions.registerApplicationUsageDay());
    }
  }, [dispatch, isActiveAppState]);
  Helper.useInterval(tickCallback);
  React.useEffect(() => {
    if (isActiveAppState) {
      dispatch(actions.registerApplicationUsage());
    }
  }, [dispatch, isActiveAppState]);
  return <Component {...props} />;
};

Notifications.setNotificationHandler({
  handleNotification: () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const hasNotificationPermissions = (settings) => settings.granted === true;

/// TODO: use https://github.com/cassiozen/useStateMachine for orchestration ???
const withUserActivity = (Component) => (props) => {
  const {
    pushToken,
    sendingPushToken,
    lastVersionReviewed,
    version,
    appUpdated,
  } = useSelector(
    ({
      application: {
        push_token: pushToken,
        sending_push_token: sendingPushToken,
        last_version_reviewed: lastVersionReviewed,
        version,
        app_updated: appUpdated,
      },
    }) => ({
      pushToken,
      sendingPushToken,
      lastVersionReviewed,
      version,
      appUpdated,
    }),
    shallowEqual,
  );
  const isActiveAppState = useAppState('active');
  const dispatch = useDispatch();
  // PERMISSIONS && USER ACTIVITY
  const alreadyHandlingRef = React.useRef(false);
  const [, setAllowNotifications] = Helper.useSharedState(
    'allowNotifications',
    false,
  );
  React.useEffect(() => {
    // only took values from the store when the app state is active or on startup
    if (isActiveAppState) {
      (async () => {
        if (alreadyHandlingRef.current === false) {
          alreadyHandlingRef.current = true;
          // always verify permissions when app state changes
          let allowNotifications = false;
          if (Device.isDevice) {
            let finalSettings = await Notifications.getPermissionsAsync();
            if (!hasNotificationPermissions(finalSettings)) {
              try {
                finalSettings = await Notifications.requestPermissionsAsync({
                  ios: {
                    allowAlert: true,
                    // allowBadge: false
                    allowSound: true,
                    allowDisplayInCarPlay: true,
                    // allowCriticalAlerts: true,
                    // https://forums.expo.io/t/handling-provideappnotificationsettings-on-sdk38/39565
                    // provideAppNotificationSettings: true,
                    // allowProvisional: true,
                    allowAnnouncements: true,
                  },
                });
              } catch (e) {
                console.warn(e);
              }
            }
            allowNotifications = hasNotificationPermissions(finalSettings);
            // update shared state
            setAllowNotifications(allowNotifications);
            // pushToken is null on initial and undefined on rehydrate
            if (!pushToken && !sendingPushToken && allowNotifications) {
              // on initial, rehydrate or fail
              dispatch(actions.registerDeviceForNotifications());
            } else if (pushToken && allowNotifications) {
              if (__DEV__) {
                console.log(
                  'Device is already registered to receive notifications',
                  pushToken,
                );
              }
            } else {
              // sending push token or notifications were disabled
            }
          } else {
            if (__DEV__) {
              console.log('Notifications are not allowed on virtual devices');
            }
          }
          alreadyHandlingRef.current = false;
        } else {
          // boot already in progress (prevent multiple permission execution)
          if (__DEV__) {
            console.log('User activity already in progress');
          }
        }
      })();
    }
  }, [dispatch, isActiveAppState]);
  // REQUEST REVIEW
  React.useEffect(() => {
    // only took values from the store when the app state is active or on startup
    if (isActiveAppState) {
      const current_date = DateUtils.get();
      const days_from_update = current_date.diff(
        appUpdated ?? Date.now(),
        'days',
      );
      // https://www.raywenderlich.com/9009-requesting-app-ratings-and-reviews-tutorial-for-ios
      if (
        days_from_update >= Settings.MAX_DAYS_FOR_REVIEW &&
        (!lastVersionReviewed ||
          Helper.isMajorVersion(lastVersionReviewed, version))
      ) {
        if (Device.isDevice) {
          StoreReview.isAvailableAsync().then((result) => {
            if (result === true) {
              StoreReview.requestReview()
                .then(() => {
                  dispatch(actions.registerApplicationReview(version));
                })
                .catch(console.warn);
            } else {
              // not supported
            }
          });
        } else {
          if (__DEV__) {
            console.log('Store review are not allowed on virtual device');
          }
        }
      }
    }
  }, [
    dispatch,
    isActiveAppState /* , appUpdated, lastVersionReviewed, version */,
  ]);
  return <Component {...props} />;
};

const withPurchases = (Component) => (props) => {
  const [, setPurchasesConfigured] = Helper.useSharedState(
    'purchasesConfigured',
    false,
  );
  React.useEffect(() => {
    const configure = async () => {
      __DEV__ && (await Purchases.setLogLevel(Purchases.LOG_LEVEL.VERBOSE));
      Purchases.configure({ apiKey: Settings.REVENUECAT_API_KEY });
    };
    configure()
      .then(() => {
        if (__DEV__) {
          console.log('🤑 Purchases configured');
        }
        setPurchasesConfigured(true);
      })
      .catch(console.warn);
  }, []);
  return <Component {...props} />;
};

const withLocalization = (Component) => (props) => {
  const locales = Localization.useLocales();
  // required for certain iOS devices where the locales are null
  const locale = (locales ?? [])[0];
  const [reloadKey, setReloadKey] = React.useState();
  React.useEffect(() => {
    if (locale) {
      AmbitoDolar.setDelimiters({
        thousands: locale.digitGroupingSeparator,
        decimal: locale.decimalSeparator,
      });
      if (__DEV__) {
        console.log('💫 User locale updated', AmbitoDolar.getDelimiters());
      }
      setReloadKey(Date.now());
    } else {
      if (__DEV__) {
        console.warn('User locale not available');
      }
    }
  }, [locale]);
  if (reloadKey) {
    return <Component key={reloadKey} {...props} />;
  }
};

export default compose(
  withRates(),
  withRealtime,
  withAppUpdateCheck,
  withAppStatistics,
  withUserActivity,
  withPurchases,
  withLocalization,
  withContainer(true),
)(AppContainer);
