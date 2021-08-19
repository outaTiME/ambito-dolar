import AmbitoDolar from '@ambito-dolar/core';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppState } from '@react-native-community/hooks';
import {
  BottomTabBar,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { NavigationContainer, useTheme } from '@react-navigation/native';
import {
  createStackNavigator,
  HeaderStyleInterpolators,
} from '@react-navigation/stack';
import * as Amplitude from 'expo-analytics-amplitude';
import * as Application from 'expo-application';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import React from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
  View,
} from 'react-native';
import { shallowEqual, useSelector, useDispatch } from 'react-redux';
import { compose } from 'redux';

import * as actions from '../actions';
import { MaterialHeaderButtons, Item } from '../components/HeaderButtons';
import MessageView from '../components/MessageView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import AboutScreen from '../screens/AboutScreen';
import AdvancedNotificationsScreen from '../screens/AdvancedNotificationsScreen';
import ConversionScreen from '../screens/ConversionScreen';
import DeveloperScreen from '../screens/DeveloperScreen';
import MainScreen from '../screens/MainScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import RateDetailScreen from '../screens/RateDetailScreen';
import RateRawDetailScreen from '../screens/RateRawDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import UpdateAppModalScreen from '../screens/UpdateAppModalScreen';
import Firebase from '../utilities/Firebase';
import Helper from '../utilities/Helper';
import Sentry from '../utilities/Sentry';

const BackButton = ({ navigation }) => (
  <MaterialHeaderButtons left>
    <Item title="back" iconName="arrow-back" onPress={navigation.goBack} />
  </MaterialHeaderButtons>
);

// used for app screenshots on android
const SOLID_NAVIGATOR_BACKGROUND = false;
const NavigatorBackgroundView = ({ style, children }) => {
  const { theme } = Helper.useTheme();
  const { colors } = useTheme();
  if (SOLID_NAVIGATOR_BACKGROUND) {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: colors.card,
          },
        ]}
      >
        {children}
      </View>
    );
  }
  return (
    <BlurView tint={theme} intensity={100} style={style}>
      {children}
    </BlurView>
  );
};

const useNavigatorScreenOptions = () => {
  const { fonts } = Helper.useTheme();
  const { colors } = useTheme();
  const headerBackground = React.useCallback(() => {
    const BackgroundView =
      Platform.OS === 'ios' ? NavigatorBackgroundView : View;
    return (
      <BackgroundView
        style={[
          {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          },
          StyleSheet.absoluteFill,
          Platform.OS === 'android' && {
            backgroundColor: colors.card,
          },
        ]}
      />
    );
  }, [colors]);
  return {
    headerTitleAlign: 'center',
    headerTitleAllowFontScaling: Settings.ALLOW_FONT_SCALING,
    headerBackAllowFontScaling: Settings.ALLOW_FONT_SCALING,
    headerStyle: {
      // same height proportion for all devices
      height: Settings.HEADER_HEIGHT,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0,
    },
    headerTitleStyle: {
      ...fonts.title,
      textTransform: 'uppercase',
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

const RateStack = createStackNavigator();
const RateStackScreen = () => {
  const navigatorScreenOptions = useNavigatorScreenOptions();
  return (
    <RateStack.Navigator screenOptions={navigatorScreenOptions}>
      <RateStack.Screen
        name={Settings.INITIAL_ROUTE_NAME}
        options={{
          title: Settings.APP_NAME,
        }}
        component={MainScreen}
      />
      <RateStack.Screen
        name="RateDetail"
        options={({ route: { params }, navigation }) => ({
          title: AmbitoDolar.getRateTitle(params.type),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={RateDetailScreen}
      />
      <RateStack.Screen
        name="RateRawDetail"
        options={({ navigation }) => ({
          title: I18n.t('detail'),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={RateRawDetailScreen}
      />
    </RateStack.Navigator>
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
    </SettingsStack.Navigator>
  );
};

const Tab = createBottomTabNavigator();

const MainStackScreen = () => {
  const { theme } = Helper.useTheme();
  const { colors } = useTheme();
  const tabBar = React.useCallback(
    (props) => {
      const BackgroundView =
        Platform.OS === 'ios' ? NavigatorBackgroundView : View;
      return (
        <BackgroundView
          style={[
            {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
            },
            Platform.select({
              ios: {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
              },
              android: {
                backgroundColor: colors.card,
              },
            }),
          ]}
        >
          <BottomTabBar {...props} />
        </BackgroundView>
      );
    },
    [colors]
  );
  return (
    <Tab.Navigator
      tabBar={tabBar}
      tabBarOptions={{
        showLabel: false,
        style: {
          elevation: 0,
          shadowOpacity: 0,
          // custom tabBar
          backgroundColor: 'transparent',
          borderTopWidth: 0,
        },
        activeTintColor: Settings.getForegroundColor(theme),
        inactiveTintColor: Settings.getStrokeColor(theme),
        allowFontScaling: Settings.ALLOW_FONT_SCALING,
      }}
    >
      <Tab.Screen
        name={Settings.INITIAL_ROUTE_NAME}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="cards-outline"
              color={color}
              size={size}
            />
          ),
        }}
        component={RateStackScreen}
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
  const [, setIsPhoneDevice] = Helper.useSharedState('isPhoneDevice');
  React.useEffect(() => {
    Device.getDeviceTypeAsync().then((device_type) =>
      setIsPhoneDevice(device_type === Device.DeviceType.PHONE)
    );
  }, []);
  const [, setContactAvailable] = Helper.useSharedState('contactAvailable');
  React.useEffect(() => {
    MailComposer.isAvailableAsync().then(setContactAvailable);
  }, []);
  const [, setStoreAvailable] = Helper.useSharedState('storeAvailable');
  React.useEffect(() => {
    Linking.canOpenURL(Settings.APP_STORE_URI).then(setStoreAvailable);
  }, []);
  const [, setInstallationTime] = Helper.useSharedState('installationTime');
  React.useEffect(() => {
    Application.getInstallationTimeAsync().then(setInstallationTime);
  }, []);
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
  const routeNameRef = React.useRef();
  const navigationRef = React.useRef();
  // NOTIFICATIONS (user interaction)
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  React.useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.actionIdentifier ===
        Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      Amplitude.logEventAsync('Select notification');
      navigationRef.current?.navigate(Settings.INITIAL_ROUTE_NAME, {
        screen: Settings.INITIAL_ROUTE_NAME,
      });
    }
  }, [lastNotificationResponse]);
  React.useEffect(() => {
    if (showAppUpdateMessage === true) {
      navigationRef.current?.navigate('ApplicationUpdate', {
        // pass
      });
    }
  }, [showAppUpdateMessage]);
  return (
    <NavigationContainer
      {...{
        ref: navigationRef,
        onReady: () => {
          routeNameRef.current = navigationRef.current.getCurrentRoute().name;
        },
        onStateChange: () => {
          const previousRouteName = routeNameRef.current;
          const currentRouteName = navigationRef.current.getCurrentRoute().name;
          if (previousRouteName !== currentRouteName) {
            trackScreen(currentRouteName);
          }
          // save the current route name for later comparision
          routeNameRef.current = currentRouteName;
        },
        theme: navigationTheme,
      }}
    >
      <RootStack.Navigator mode="modal" headerMode="none">
        <RootStack.Screen
          name={Settings.INITIAL_ROUTE_NAME}
          component={MainStackScreen}
        />
        <RootStack.Screen
          name="ApplicationUpdate"
          component={UpdateAppModalScreen}
          options={{
            gestureEnabled: false,
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const AppContainer = ({ showAppUpdateMessage }) => {
  const { theme } = Helper.useTheme();
  // STILL LOADING
  const [stillLoading, setStillLoading] = React.useState(false);
  React.useEffect(() => {
    const timer_id = setTimeout(() => {
      setStillLoading(true);
    }, Settings.STILL_LOADING_TIMEOUT);
    return () => clearTimeout(timer_id);
  }, []);
  const rates = useSelector((state) => state.rates.rates);
  const hasRates = React.useMemo(() => Helper.hasRates(rates), [rates]);
  return (
    <>
      {rates ? (
        hasRates ? (
          <AppNavigationContainer {...{ showAppUpdateMessage }} />
        ) : (
          <MessageView message={I18n.t('no_available_rates')} />
        )
      ) : (
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
      )}
    </>
  );
};

// TODO: export to components to clean up

// HOCs

const withFirebase = (Component) => (props) => {
  const dispatch = useDispatch();
  const processedAt = useSelector((state) => state.rates.processed_at);
  const processedAtRef = React.useRef(processedAt);
  React.useEffect(() => {
    processedAtRef.current = processedAt;
  }, [processedAt]);
  React.useEffect(() => {
    Firebase.auth()
      .signInAnonymously()
      .catch((error) => {
        console.error('Firebase user login error', error);
      });
    const subscription = Firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        const uid = user.uid;
        if (__DEV__) {
          console.log('Firebase user signed in', uid);
        }
        const db = Firebase.database();
        db.ref('processed_at').on('value', (snapshot) => {
          const remoteProcessedAt = snapshot.val();
          Sentry.addBreadcrumb({
            message: 'Firebase update message received',
            data: remoteProcessedAt,
          });
          if (processedAtRef.current !== remoteProcessedAt) {
            if (__DEV__) {
              console.log(
                'Updating rates',
                remoteProcessedAt,
                processedAtRef.current
              );
            }
            Helper.getRates()
              .then((data) => {
                if (__DEV__) {
                  console.log('Rates updated', data.processed_at);
                }
                dispatch(actions.addRates(data));
              })
              .catch((error) => {
                // silent ignore when error or invalid data
                if (__DEV__) {
                  console.warn('Unable to get rates', error);
                }
                Sentry.addBreadcrumb({
                  message: 'Unable to get rates',
                  data: error.message,
                });
              });
          } else {
            if (__DEV__) {
              console.log(
                'Rates already updated',
                remoteProcessedAt,
                processedAtRef.current
              );
            }
          }
        });
        // handle firebase connection
        /* db.ref('.info/connected').on('value', (snapshot) => {
          if (snapshot.val() === true) {
            console.log('connected');
          } else {
            console.log('not connected');
          }
        }); */
      } else {
        if (__DEV__) {
          console.log('Firebase user signed out');
        }
      }
    });
    return () => {
      subscription();
      Firebase.auth().signOut();
    };
  }, [dispatch]);
  return <Component {...props} />;
};

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
};

export default compose(
  // only when plain messages, AppNavigationContainer uses from screens
  withContainer(true),
  withFirebase,
  withUserActivity,
  withAppStatistics,
  withAppUpdateCheck
)(AppContainer);
