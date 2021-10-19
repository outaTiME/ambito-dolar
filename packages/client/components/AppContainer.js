import AmbitoDolar from '@ambito-dolar/core';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppState } from '@react-native-community/hooks';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  NavigationContainer,
  useNavigationContainerRef,
  useTheme,
} from '@react-navigation/native';
import {
  createStackNavigator,
  HeaderStyleInterpolators,
} from '@react-navigation/stack';
import * as Amplitude from 'expo-analytics-amplitude';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import React from 'react';
import { StyleSheet, ActivityIndicator, Platform, View } from 'react-native';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { compose } from 'redux';
import useSWR, { useSWRConfig } from 'swr';

import * as actions from '../actions';
import ActionButton from '../components/ActionButton';
import { MaterialHeaderButtons, Item } from '../components/HeaderButtons';
import MessageView from '../components/MessageView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
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
import Helper from '../utilities/Helper';
import Sentry from '../utilities/Sentry';

const BackButton = ({ navigation }) => (
  <MaterialHeaderButtons left>
    <Item title="back" iconName="arrow-back" onPress={navigation.goBack} />
  </MaterialHeaderButtons>
);

const NavigatorBackgroundView = ({ style }) => {
  const { theme } = Helper.useTheme();
  const { colors } = useTheme();
  if (Platform.OS === 'android') {
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
  const { fonts } = Helper.useTheme();
  const { colors } = useTheme();
  const headerBackground = React.useCallback(
    () => (
      <NavigatorBackgroundView
        style={{
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      />
    ),
    [colors]
  );
  return {
    headerTitleAlign: 'center',
    headerTitleAllowFontScaling: Settings.ALLOW_FONT_SCALING,
    headerBackAllowFontScaling: Settings.ALLOW_FONT_SCALING,
    headerStyle: {
      // same height proportion for all devices
      // height: Settings.HEADER_HEIGHT,
      /* elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0, */
    },
    headerTitleStyle: {
      ...fonts.title,
      // ...fonts.body,
      // textTransform: 'uppercase',
    },
    ...(Platform.OS === 'ios' && {
      headerTransparent: true,
    }),
    headerBackground,
    headerStyleInterpolator: HeaderStyleInterpolators.forUIKit,
  };
};

/* const NativeStack = createNativeStackNavigator();

const RateNativeStackScreen = () => {
  const { theme } = Helper.useTheme();
  return (
    <NativeStack.Navigator
      screenOptions={{
        headerBackTitleVisible: false,
        headerLargeStyle: {
          backgroundColor: Settings.getBackgroundColor(theme),
        },
        // headerLargeTitle: true,
        headerLargeTitleHideShadow: true,
        headerLargeTitleStyle: {
          // https://github.com/expo/expo/issues/1959#issuecomment-780198250
          fontFamily: processFontFamily(Settings.getFontObject().fontFamily),
          // fontSize: 20,
          // color: 'white',
        },
        headerStyle: {
          backgroundColor: 'transparent',
          blurEffect: theme,
        },
        headerTintColor: Settings.getForegroundColor(theme),
        headerTitleStyle: {
          // https://github.com/expo/expo/issues/1959#issuecomment-780198250
          fontFamily: processFontFamily(Settings.getFontObject().fontFamily),
          fontSize: 20,
        },
        headerTranslucent: Platform.OS === 'ios',
      }}
    >
      <NativeStack.Screen
        name={Settings.INITIAL_ROUTE_NAME}
        options={{
          // title: Settings.APP_NAME.toUpperCase(),
          title: Settings.APP_NAME,
          headerLargeTitle: true,
        }}
        component={MainScreen}
      />
      <NativeStack.Screen
        name="RateDetail"
        options={({ route: { params }, navigation }) => ({
          title: AmbitoDolar.getRateTitle(params.type),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={RateDetailScreen}
      />
      <NativeStack.Screen
        name="RateRawDetail"
        options={({ navigation }) => ({
          title: I18n.t('detail'),
          // headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={RateRawDetailScreen}
      />
    </NativeStack.Navigator>
  );
}; */

const RatesStack = createStackNavigator();
const RatesStackScreen = () => {
  const navigatorScreenOptions = useNavigatorScreenOptions();
  return (
    <RatesStack.Navigator screenOptions={navigatorScreenOptions}>
      <RatesStack.Screen
        name={Settings.INITIAL_ROUTE_NAME}
        options={{
          title: Settings.APP_NAME,
        }}
        component={MainScreen}
      />
      <RatesStack.Screen
        name="RateDetail"
        options={({ route: { params }, navigation }) => ({
          title: AmbitoDolar.getRateTitle(params.type),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={RateDetailScreen}
      />
      <RatesStack.Screen
        name="RateRawDetail"
        options={({ navigation }) => ({
          title: I18n.t('detail'),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={RateRawDetailScreen}
      />
    </RatesStack.Navigator>
  );
};

const ConversionStack = createStackNavigator();
const ConversionStackScreen = () => {
  const navigatorScreenOptions = useNavigatorScreenOptions();
  return (
    <ConversionStack.Navigator screenOptions={navigatorScreenOptions}>
      <ConversionStack.Screen
        name="Conversion"
        options={{
          title: I18n.t('conversion'),
          headerLargeTitle: true,
        }}
        component={ConversionScreen}
      />
    </ConversionStack.Navigator>
  );
};

const SettingsStack = createStackNavigator();
const SettingsStackScreen = () => {
  const navigatorScreenOptions = useNavigatorScreenOptions();
  const [allowNotifications] = Helper.useSharedState('allowNotifications');
  return (
    <SettingsStack.Navigator screenOptions={navigatorScreenOptions}>
      <SettingsStack.Screen
        name="Settings"
        options={{
          title: I18n.t('settings'),
          // headerLargeTitle: true,
        }}
        component={SettingsScreen}
      />
      <SettingsStack.Screen
        name="Notifications"
        options={({ navigation }) => ({
          title: I18n.t('notifications'),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={NotificationsScreen}
      />
      {(!Constants.isDevice || allowNotifications) && (
        <SettingsStack.Screen
          name="AdvancedNotifications"
          options={({ route: { params }, navigation }) => ({
            title: AmbitoDolar.getNotificationTitle(params.type),
            headerLeft: () => <BackButton {...{ navigation }} />,
          })}
          component={AdvancedNotificationsScreen}
        />
      )}
      <SettingsStack.Screen
        name="Developer"
        options={({ navigation }) => ({
          title: I18n.t('developer'),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={DeveloperScreen}
      />
      <SettingsStack.Screen
        name="About"
        options={({ navigation }) => ({
          title: I18n.t('about'),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={AboutScreen}
      />
      <SettingsStack.Screen
        name="Statistics"
        options={({ navigation }) => ({
          title: I18n.t('statistics'),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={StatisticsScreen}
      />
      <SettingsStack.Screen
        name="Appearance"
        options={({ navigation }) => ({
          title: I18n.t('appearance'),
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
  const { colors } = useTheme();
  const tabBarBackground = React.useCallback(
    () => (
      <NavigatorBackgroundView
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        }}
      />
    ),
    [colors]
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
        name="Rates"
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
        name="Conversion"
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
      />
      <Tab.Screen
        name="Settings"
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

const RootStack = createStackNavigator();
const AppNavigationContainer = ({ showAppUpdateMessage }) => {
  const { theme } = Helper.useTheme();
  const navigationTheme = React.useMemo(
    () => ({
      dark: theme === 'dark',
      colors: {
        card: Settings.getContentColor(theme),
        border: Settings.getSeparatorColor(theme),
      },
    }),
    [theme]
  );
  const trackScreen = React.useCallback((name) => {
    if (__DEV__) {
      console.log('Analytics track screen', name);
    }
    Sentry.addBreadcrumb({
      message: `${name} screen`,
    });
    Amplitude.logEventAsync(`${name} screen`);
  }, []);
  React.useEffect(() => {
    const uid = Constants.installationId;
    // use same device identifier for better association
    Sentry.setUserContext({
      id: uid,
    });
    Amplitude.setUserIdAsync(uid);
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
      Amplitude.logEventAsync('Select notification');
      navigationRef.navigate(Settings.INITIAL_ROUTE_NAME, {
        screen: 'Rates',
        params: {
          screen: Settings.INITIAL_ROUTE_NAME,
        },
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
  return (
    <NavigationContainer
      {...{
        ref: navigationRef,
        onReady: () => {
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

const AppContainer = ({ showAppUpdateMessage }) => {
  const { theme } = Helper.useTheme();
  const [stillLoading, setStillLoading] = React.useState(false);
  const {
    // data,
    error,
    isValidating,
    mutate: refetchRates,
  } = useSWR('rates', () => Helper.getRates(), {
    revalidateOnReconnect: false,
    // refreshInterval: 1 * 60 * 1000,
    shouldRetryOnError: false,
    // focusThrottleInterval: 10 * 1000,
    // loadingTimeout: 10 * 1000,
    // ...(rates && { fallbackData: rates }),
    onLoadingSlow: () => {
      if (__DEV__) {
        console.log('Rates still loading');
      }
      setStillLoading(true);
    },
    onSuccess: (data) => {
      if (__DEV__) {
        console.log('Rates updated', data.processed_at);
      }
      dispatch(actions.addRates(data));
      setStillLoading(false);
    },
    onError: (error) => {
      if (__DEV__) {
        console.warn('Unable to get rates', error);
      }
      setStillLoading(false);
    },
  });
  const dispatch = useDispatch();
  /* React.useEffect(() => {
    if (data) {
      if (__DEV__) {
        console.log('Rates updated');
      }
      dispatch(actions.addRates(data));
    }
  }, [dispatch, data]);
  React.useEffect(() => {
    if (error) {
      if (__DEV__) {
        console.warn('Unable to get rates', error);
      }
    }
  }, [error]); */
  const [, setUpdatingRates] = Helper.useSharedState('updatingRates');
  React.useEffect(() => {
    // TODO: leave spinner only when focus or reconnect (use react ref)
    setUpdatingRates(isValidating);
    console.log('>>> useSWR (loading)', isValidating);
  }, [isValidating]);
  const rates = Helper.useRates();
  const hasRates = React.useMemo(() => Helper.hasValidRates(rates), [rates]);
  React.useEffect(() => {
    if (rates && hasRates && error) {
      // TODO: display error or silent ignore ???
    }
  }, [rates, hasRates, error]);
  React.useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) {
          console.log('Notification received', notification);
        }
        refetchRates();
      }
    );
    return () => subscription.remove();
  }, []);
  const prevRates = Helper.usePrevious(rates);
  const { cache } = useSWRConfig();
  React.useEffect(() => {
    if (prevRates && !rates) {
      if (__DEV__) {
        console.log('Local store cleaned');
      }
      cache.delete('rates');
      refetchRates();
    }
  }, [rates, prevRates]);
  const errorOnBoot = !rates && error;
  const invalidRates = rates && !hasRates;
  if (errorOnBoot || invalidRates) {
    return (
      <>
        <MessageView
          style={{
            marginBottom: Settings.PADDING * 2,
          }}
          message={I18n.t(
            errorOnBoot ? 'rates_loading_error' : 'no_available_rates'
          )}
        />
        <ActionButton
          title={I18n.t('retry')}
          handleOnPress={refetchRates}
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
  return <AppNavigationContainer {...{ showAppUpdateMessage }} />;
};

// TODO: export to components to clean up

// HOCs

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const hasNotificationPermissions = (settings) =>
  settings.granted ||
  settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

// FIXME: use days_used to handle app loads

/// TODO: use https://github.com/cassiozen/useStateMachine for orchestration
const withUserActivity = (Component) => (props) => {
  const { pushToken, sendingPushToken, loads, lastVersionReviewed } =
    useSelector(
      ({
        application: {
          push_token: pushToken,
          sending_push_token: sendingPushToken,
          loads,
          last_version_reviewed: lastVersionReviewed,
        },
      }) => ({
        pushToken,
        sendingPushToken,
        loads,
        lastVersionReviewed,
      }),
      shallowEqual
    );
  const currentAppState = useAppState();
  const dispatch = useDispatch();
  // PERMISSIONS && USER ACTIVITY
  const alreadyHandlingRef = React.useRef(false);
  const [, setAllowNotifications] = Helper.useSharedState(
    'allowNotifications',
    false
  );
  React.useEffect(() => {
    // only took store state values when fresh start or app state is active
    if (currentAppState === 'active') {
      (async () => {
        if (alreadyHandlingRef.current === false) {
          alreadyHandlingRef.current = true;
          // always verify permissions when app state changes
          let allowNotifications = false;
          if (Constants.isDevice) {
            let finalSettings = await Notifications.getPermissionsAsync();
            if (!hasNotificationPermissions(finalSettings)) {
              finalSettings = await Notifications.requestPermissionsAsync({
                ios: {
                  allowSound: true,
                  allowAlert: true,
                  allowDisplayInCarPlay: true,
                  // https://forums.expo.io/t/handling-provideappnotificationsettings-on-sdk38/39565
                  // provideAppNotificationSettings: true,
                  allowProvisional: true,
                  allowAnnouncements: true,
                },
              });
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
              console.log('Notifications are not allowed on virtual devices.');
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
  }, [dispatch, currentAppState]);
  // https://docs.expo.dev/versions/v43.0.0/sdk/notifications/#addpushtokenlistenerlistener-pushtokenlistener-subscription
  /* React.useEffect(() => {
    const subscription = Notifications.addPushTokenListener((push_token) => {
      if (__DEV__) {
        console.log('Device push token updated', push_token);
      }
      dispatch(actions.registerDeviceForNotifications(push_token));
    });
    return () => subscription.remove();
  }, [dispatch]); */
  // REQUEST REVIEW
  React.useEffect(() => {
    // only took store state values when fresh start or app state is active
    if (currentAppState === 'active') {
      if (loads >= Settings.MAX_LOADS_FOR_REVIEW) {
        // https://www.raywenderlich.com/9009-requesting-app-ratings-and-reviews-tutorial-for-ios
        if (
          !lastVersionReviewed ||
          Helper.isMajorVersion(lastVersionReviewed, Settings.APP_VERSION)
        ) {
          if (Constants.isDevice) {
            StoreReview.isAvailableAsync().then((result) => {
              if (result === true) {
                // fails on android when no play services
                // https://github.com/expo/expo/issues/11784
                StoreReview.requestReview()
                  .catch(() => {
                    // silent ignore when error
                  })
                  .then(() => {
                    dispatch(
                      actions.registerApplicationReview(Settings.APP_VERSION)
                    );
                  });
              } else {
                // not supported
              }
            });
          } else {
            if (__DEV__) {
              console.log('Store review are not allowed on virtual device.');
            }
          }
        }
        // }
      } else {
        dispatch(actions.registerApplicationLoad());
      }
    }
  }, [dispatch, currentAppState]);
  return <Component {...props} />;
};

const withAppStatistics = (Component) => (props) => {
  const dispatch = useDispatch();
  const tickCallback = React.useCallback(() => {
    dispatch(actions.registerApplicationUsageDay());
  }, [dispatch]);
  Helper.useInterval(tickCallback);
  return <Component {...props} />;
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
  }, [dispatch]);
  return <Component showAppUpdateMessage={showAppUpdateMessage} {...props} />;
  /* const [storeAvailable] = Helper.useSharedState('storeAvailable', false);
  if (showAppUpdateMessage) {
    return (
      <>
        <MessageView
          style={{
            marginBottom: Settings.PADDING * 2,
          }}
          message={I18n.t('update_app')}
        />
        {storeAvailable && (
          <ActionButton
            title={I18n.t('update')}
            handleOnPress={() => {
              Linking.openURL(Settings.APP_STORE_URI);
            }}
            style={{
              marginBottom: Settings.PADDING,
            }}
            alternativeBackground
          />
        )}
        <ActionButton
          borderless={storeAvailable}
          title={I18n.t('remind_me_later')}
          handleOnPress={() => {
            dispatch(actions.ignoreApplicationUpdate());
          }}
          // small={storeAvailable}
        />
      </>
    );
  }
  return <Component {...props} />; */
};

export default compose(
  // only when plain messages, AppNavigationContainer uses from screens
  withContainer(true),
  withUserActivity,
  withAppStatistics,
  withAppUpdateCheck
)(AppContainer);
