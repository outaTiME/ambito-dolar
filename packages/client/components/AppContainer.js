import AmbitoDolar from '@ambito-dolar/core';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  NavigationContainer,
  useNavigationContainerRef,
  useTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { compose } from '@reduxjs/toolkit';
import * as Amplitude from 'expo-analytics-amplitude';
import { BlurView } from 'expo-blur';
import * as Device from 'expo-device';
import { processFontFamily } from 'expo-font';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import React from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  Platform,
  View,
  DeviceEventEmitter,
} from 'react-native';
import QuickActions from 'react-native-quick-actions';
import { useSelector, shallowEqual, useDispatch, batch } from 'react-redux';

import * as actions from '../actions';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import useAppState from '../hooks/useAppState';
import AboutScreen from '../screens/AboutScreen';
import AdvancedNotificationsScreen from '../screens/AdvancedNotificationsScreen';
import AppearanceScreen from '../screens/AppearanceScreen';
import ConversionScreen from '../screens/ConversionScreen';
import DeveloperScreen from '../screens/DeveloperScreen';
import MainScreen from '../screens/MainScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import RateDetailScreen from '../screens/RateDetailScreen';
import RateRawDetailScreen from '../screens/RateRawDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import UpdateAppModalScreen from '../screens/UpdateAppModalScreen';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';
import Sentry from '../utilities/Sentry';
import ActionButton from './ActionButton';
import { MaterialHeaderButtons, Item } from './HeaderButtons';
import MessageView from './MessageView';
import withContainer from './withContainer';

const BackButton = ({ navigation }) => (
  <MaterialHeaderButtons left>
    <Item title="back" iconName="arrow-back" onPress={navigation.goBack} />
  </MaterialHeaderButtons>
);

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
      tint={theme}
      intensity={100}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
};

const useNavigatorScreenOptions = () => {
  const { theme } = Helper.useTheme();
  const headerBackground = React.useCallback(
    () => <NavigatorBackgroundView />,
    []
  );
  return {
    headerBackVisible: false,
    headerShadowVisible: false,
    headerTintColor: Settings.getForegroundColor(theme),
    headerTitleAlign: 'center',
    headerTitleStyle: {
      // fonts.title
      fontFamily: processFontFamily(Settings.getFontObject().fontFamily),
      fontSize: 20,
      fontWeight: '400',
    },
    ...Platform.select({
      ios: {
        ...(!BLUR_EFFECT_ON_NAVIGATION_BARS
          ? { headerBackground }
          : { headerBlurEffect: theme }),
        headerTransparent: true,
      },
      android: {
        headerBackground,
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
              AmbitoDolar.getNotificationTitle(params.type)
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
    </SettingsStack.Navigator>
  );
};

const Tab = createBottomTabNavigator();
const MainStackScreen = () => {
  const { theme } = Helper.useTheme();
  const tabBarBackground = React.useCallback(
    () => <NavigatorBackgroundView />,
    []
  );
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Settings.getForegroundColor(theme),
        tabBarInactiveTintColor: Settings.getStrokeColor(theme),
        tabBarAllowFontScaling: Settings.ALLOW_FONT_SCALING,
        tabBarStyle: {
          ...(Platform.OS === 'ios' && {
            position: 'absolute',
          }),
          // https://github.com/react-navigation/react-navigation/blob/main/packages/bottom-tabs/src/views/BottomTabBar.tsx#L382
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground,
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
          tabPress: () => {
            // e.preventDefault();
            navigation.navigate(route.name, {
              screen: 'Conversion',
              params: {
                focus: false,
              },
            });
          },
          tabLongPress: () => {
            // e.preventDefault();
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

let initialQuickAction;
// https://github.com/jordanbyron/react-native-quick-actions#listening-for-quick-actions
!__DEV__ &&
  QuickActions.popInitialAction()
    .then((data) => (initialQuickAction = data))
    .catch(console.error);

const RootStack = createNativeStackNavigator();
const AppNavigationContainer = ({ showAppUpdateMessage }) => {
  const { theme } = Helper.useTheme();
  const navigationTheme = React.useMemo(
    () => ({
      dark: theme === 'dark',
      colors: {
        // background: Settings.getBackgroundColor(theme, true),
        card: Settings.getContentColor(theme),
        border: Settings.getSeparatorColor(theme),
      },
    }),
    [theme]
  );
  const trackScreen = React.useCallback((name) => {
    if (__DEV__) {
      console.log('👀 Track screen', name);
    }
    Sentry.addBreadcrumb({
      message: `${name} screen`,
    });
    Amplitude.logEventAsync(`${name} screen`).catch(console.warn);
  }, []);
  React.useEffect(() => {
    const uid = Settings.INSTALLATION_ID;
    // use same device identifier for better association
    Sentry.setUserContext({
      id: uid,
    });
    Amplitude.setUserIdAsync(uid).catch(console.warn);
    // track initial screen
    trackScreen(Settings.INITIAL_ROUTE_NAME);
  }, []);
  // https://reactnavigation.org/docs/screen-tracking
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = React.useRef();
  // NOTIFICATIONS (user interaction)
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  React.useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.actionIdentifier ===
        Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      Amplitude.logEventAsync('Select notification').catch(console.warn);
      navigationRef.navigate('RatesTab', {
        screen: Settings.INITIAL_ROUTE_NAME,
      });
    }
  }, [lastNotificationResponse]);
  React.useEffect(() => {
    if (showAppUpdateMessage === true) {
      navigationRef.navigate('ApplicationUpdate', {
        // pass
      });
    }
  }, [showAppUpdateMessage]);
  // QUICK ACTIONS
  const onQuickAction = React.useCallback((data) => {
    if (__DEV__) {
      console.log('Quick action received', data);
    }
    const type = data?.type;
    if (type) {
      Amplitude.logEventWithPropertiesAsync('Quick action', {
        type,
      }).catch(console.warn);
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
      onQuickAction
    );
    return () => {
      subscription.remove();
    };
  }, []);
  return (
    <NavigationContainer
      {...{
        ref: navigationRef,
        onReady: () => {
          // TODO: send signal to remove splash screen ???
          routeNameRef.current = navigationRef.getCurrentRoute().name;
        },
        onStateChange: () => {
          const previousRouteName = routeNameRef.current;
          const currentRouteName = navigationRef.getCurrentRoute().name;
          if (previousRouteName !== currentRouteName) {
            trackScreen(currentRouteName);
          }
          // save the current route name for later comparision
          routeNameRef.current = currentRouteName;
        },
        theme: navigationTheme,
      }}
    >
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <RootStack.Group>
          <RootStack.Screen
            name={Settings.INITIAL_ROUTE_NAME}
            component={MainStackScreen}
          />
        </RootStack.Group>
        <RootStack.Group
          screenOptions={{
            // animation: 'none',
            presentation: 'transparentModal',
            gestureEnabled: false,
          }}
        >
          <RootStack.Screen
            name="ApplicationUpdate"
            component={UpdateAppModalScreen}
          />
        </RootStack.Group>
      </RootStack.Navigator>
    </NavigationContainer>
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
    shallowEqual
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
    shallowEqual
  );
  const isActiveAppState = useAppState('active');
  const dispatch = useDispatch();
  // PERMISSIONS && USER ACTIVITY
  const alreadyHandlingRef = React.useRef(false);
  const [, setAllowNotifications] = Helper.useSharedState(
    'allowNotifications',
    false
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
                  pushToken
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
        'days'
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
              // fails on android when no play services
              // https://github.com/expo/expo/issues/11784
              StoreReview.requestReview()
                .catch(console.warn)
                .then(() => {
                  dispatch(actions.registerApplicationReview(version));
                });
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

const EnhancedAppNavigationContainer = compose(
  withAppUpdateCheck,
  withAppStatistics,
  withUserActivity
)(AppNavigationContainer);

const firebaseApp =
  Settings.FIREBASE_CONFIG_JSON &&
  initializeApp(JSON.parse(Settings.FIREBASE_CONFIG_JSON));

const AppContainer = () => {
  const { theme } = Helper.useTheme();
  const rates = Helper.useRates();
  const hasRates = React.useMemo(() => Helper.hasValidRates(rates), [rates]);
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
      setUpdatingRates(true);
      setError(false);
      setStillLoading(false);
      const timer_id = setTimeout(() => {
        setStillLoading(true);
      }, Settings.STILL_LOADING_TIMEOUT);
      return Helper.getRates(initial)
        .then((data) => {
          batch(() => {
            dispatch(actions.addRates(data));
            dispatch(actions.registerApplicationDownloadRates());
          });
        })
        .catch(() => {
          setError(true);
        })
        .finally(() => {
          setUpdatingRates(false);
          clearTimeout(timer_id);
        });
    },
    [dispatch]
  );
  // UPDATE CHECK
  const updatedAt = useSelector((state) => state.rates?.updated_at);
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
        return onValue(ref(db, 'u'), (snapshot) => {
          // use rates file format
          const updated_at = AmbitoDolar.getTimezoneDate(
            snapshot.val() * 1000
          ).format();
          Sentry.addBreadcrumb({
            message: 'Firebase update event',
            data: updated_at,
          });
          if (__DEV__) {
            console.log(
              '⚡️ Firebase updated',
              updated_at,
              updatedAtRef.current
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
      return;
    }
    if (__DEV__) {
      console.log('🚀 Initial fetch');
    }
    fetchRates(true);
  }, [isInitial]);
  if (isInitial && error) {
    return (
      <>
        <MessageView
          style={{
            marginBottom: Settings.PADDING * 2,
          }}
          message={I18n.t('rates_loading_error')}
        />
        <ActionButton
          title={I18n.t('retry')}
          handleOnPress={() => fetchRates(true)}
          alternativeBackground
        />
      </>
    );
  }
  if (!rates) {
    return (
      <>
        <ActivityIndicator
          animating
          color={Settings.getForegroundColor(theme)}
          size="small"
        />
        {stillLoading && (
          <MessageView
            style={{ marginTop: Settings.PADDING * 2 }}
            message={I18n.t('still_loading')}
          />
        )}
      </>
    );
  }
  if (rates && !hasRates) {
    return (
      <MessageView
        style={{
          marginBottom: Settings.PADDING * 2,
        }}
        message={I18n.t('no_available_rates')}
      />
    );
  }
  return <EnhancedAppNavigationContainer />;
};

export default compose(
  // only when plain messages, AppNavigationContainer uses from screens
  withContainer(true)
)(AppContainer);
