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
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import * as React from 'react';
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
import AdvancedNotificationsScreen from '../screens/AdvancedNotificationsScreen';
import ConvertionScreen from '../screens/ConvertionScreen';
import DeveloperScreen from '../screens/DeveloperScreen';
import MainScreen from '../screens/MainScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import RateDetailScreen from '../screens/RateDetailScreen';
import RateRawDetailScreen from '../screens/RateRawDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import UpdateAppModalScreen from '../screens/UpdateAppModalScreen';
import DateUtils from '../utilities/Date';
import Firebase from '../utilities/Firebase';
import Helper from '../utilities/Helper';
import Sentry from '../utilities/Sentry';

const BackButton = ({ navigation }) => (
  <MaterialHeaderButtons left>
    <Item title="back" iconName="arrow-back" onPress={navigation.goBack} />
  </MaterialHeaderButtons>
);

const SOLID_BACKGROUND_FOR_APP_SCREENSHOT = false;

const NavigatorBackgroundView = ({ style, children }) => {
  const { theme } = Helper.useTheme();
  if (SOLID_BACKGROUND_FOR_APP_SCREENSHOT) {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: Settings.getContentColor(theme),
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

const MainStack = createStackNavigator();

const StackNavigator = ({ children }) => {
  const { theme, fonts } = Helper.useTheme();
  const { colors } = useTheme();
  const header_background = React.useCallback(
    () => (
      <NavigatorBackgroundView
        style={[
          {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          },
          StyleSheet.absoluteFill,
        ]}
      />
    ),
    [theme]
  );
  return (
    <MainStack.Navigator
      // initialRouteName={Settings.INITIAL_ROUTE_NAME}
      screenOptions={{
        // required by android
        headerTitleAlign: 'center',
        headerTitleAllowFontScaling: Settings.ALLOW_FONT_SCALING,
        headerBackAllowFontScaling: Settings.ALLOW_FONT_SCALING,
        // https://github.com/react-navigation/react-navigation/blob/master/packages/stack/src/views/Header/HeaderSegment.tsx#L64
        headerStyle: {
          // same height proportion for all devices
          height: Settings.HEADER_HEIGHT,
          elevation: 0,
          shadowOpacity: 0,
          // https://github.com/react-navigation/react-navigation/blob/main/packages/stack/src/views/Header/HeaderBackground.tsx#L52
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: {
          ...fonts.title,
          textTransform: 'uppercase',
        },
        headerStyleInterpolator: HeaderStyleInterpolators.forUIKit,
        ...(Platform.OS === 'ios' && {
          headerTransparent: true,
          headerBackground: header_background,
        }),
      }}
    >
      {children}
    </MainStack.Navigator>
  );
};

const RateStackScreen = () => (
  <StackNavigator>
    <MainStack.Screen
      name={Settings.INITIAL_ROUTE_NAME}
      options={{
        title: Settings.APP_NAME,
        headerLargeTitle: true,
      }}
      component={MainScreen}
    />
    <MainStack.Screen
      name="RateDetail"
      options={({ route: { params }, navigation }) => ({
        title: AmbitoDolar.getRateTitle(params.type),
        headerLeft: () => <BackButton {...{ navigation }} />,
      })}
      component={RateDetailScreen}
    />
    <MainStack.Screen
      name="RateRawDetail"
      options={({ navigation }) => ({
        title: 'Detalle',
        headerLeft: () => <BackButton {...{ navigation }} />,
      })}
      component={RateRawDetailScreen}
    />
  </StackNavigator>
);

const ConvertionStackScreen = () => (
  <StackNavigator>
    <MainStack.Screen
      name="Convertion"
      options={{
        title: 'Conversor',
        headerLargeTitle: true,
      }}
      component={ConvertionScreen}
    />
  </StackNavigator>
);

const SettingsStackScreen = () => {
  const [allowNotifications] = Helper.useSharedState('allowNotifications');
  return (
    <StackNavigator>
      <MainStack.Screen
        name="Settings"
        options={{
          title: 'Ajustes',
          headerLargeTitle: true,
        }}
        component={SettingsScreen}
      />
      <MainStack.Screen
        name="Notifications"
        options={({ navigation }) => ({
          title: 'Notificaciones',
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={NotificationsScreen}
      />
      {(!Constants.isDevice || allowNotifications) && (
        <MainStack.Screen
          name="AdvancedNotifications"
          options={({ route: { params }, navigation }) => ({
            title: AmbitoDolar.getNotificationTitle(params.type),
            headerLeft: () => <BackButton {...{ navigation }} />,
          })}
          component={AdvancedNotificationsScreen}
        />
      )}
      <MainStack.Screen
        name="Developer"
        options={({ navigation }) => ({
          title: I18n.t('developer'),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={DeveloperScreen}
      />
    </StackNavigator>
  );
};

const Tab = createBottomTabNavigator();

const MainStackScreen = () => {
  const { theme } = Helper.useTheme();
  const tab_bar = React.useCallback(
    (props) => (
      <NavigatorBackgroundView
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        <BottomTabBar {...props} />
      </NavigatorBackgroundView>
    ),
    []
  );
  return (
    <Tab.Navigator
      // initialRouteName={Settings.INITIAL_ROUTE_NAME}
      tabBarOptions={{
        showLabel: false,
        style: {
          elevation: 0,
          shadowOpacity: 0,
          ...(Platform.OS === 'ios' && { backgroundColor: 'transparent' }),
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        activeTintColor: Settings.getForegroundColor(theme),
        inactiveTintColor: Settings.getStrokeColor(theme),
        allowFontScaling: Settings.ALLOW_FONT_SCALING,
      }}
      {...(Platform.OS === 'ios' && {
        tabBar: tab_bar,
      })}
    >
      <Tab.Screen
        name={Settings.INITIAL_ROUTE_NAME}
        options={{
          tabBarLabel: 'Inicio',
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
        name="Convertion"
        options={{
          tabBarLabel: 'Conversor',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="filter-outline"
              color={color}
              size={size}
            />
          ),
        }}
        component={ConvertionStackScreen}
      />
      <Tab.Screen
        name="Settings"
        options={{
          tabBarLabel: 'Ajustes',
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
  const navigation_theme = React.useMemo(
    () => ({
      dark: theme === 'dark',
      colors: {
        card: Settings.getContentColor(theme),
        border: Settings.getStrokeColor(theme, Platform.OS === 'ios'),
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
          // Save the current route name for later comparision
          routeNameRef.current = currentRouteName;
        },
        theme: navigation_theme,
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
  const rates = useSelector((state) => state.rates?.rates);
  const has_rates = React.useMemo(() => Helper.hasRates(rates), [rates]);
  return (
    <>
      {rates ? (
        has_rates ? (
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

// HOCs

const withFirebase = (Component) => (props) => {
  const dispatch = useDispatch();
  React.useEffect(() => {
    Firebase.auth()
      .signInAnonymously()
      .catch((error) => {
        console.error('User login error', error);
      });
    const subscription = Firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        const isAnonymous = user.isAnonymous;
        const uid = user.uid;
        if (__DEV__) {
          console.log('User signed in', isAnonymous, uid);
        }
        const db = Firebase.database();
        db.ref('updated_at').on('value', (snapshot) => {
          Sentry.addBreadcrumb({
            message: 'Firebase update event',
            data: snapshot.val(),
          });
          Helper.getRates()
            .then((data) => {
              const datetime = Date.now();
              if (__DEV__) {
                console.log(
                  'Stats updated',
                  DateUtils.datetime(datetime, { short: true, seconds: true })
                );
              }
              dispatch(actions.addRates(data));
            })
            .catch((error) => {
              // silent ignore when error or invalid data
              if (__DEV__) {
                console.warn('Unable to update rate stats', error);
              }
              Sentry.addBreadcrumb({
                message: 'Unable to update rate stats',
                data: error.message,
              });
            });
        });
        db.ref('processed_at').on('value', (snapshot) => {
          const processed_at = snapshot.val();
          Sentry.addBreadcrumb({
            message: 'Firebase processed event',
            data: processed_at,
          });
          if (__DEV__) {
            console.log(
              'Stats processed',
              DateUtils.datetime(processed_at, { short: true, seconds: true })
            );
          }
          dispatch(actions.updateRatesProcessedAt(processed_at));
        });
      } else {
        if (__DEV__) {
          console.log('User signed out');
        }
      }
    });
    return () => {
      subscription();
      Firebase.auth().signOut();
    };
  }, []);
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

// TODO: use https://github.com/cassiozen/useStateMachine for orchestration
const withUserActivity = (Component) => (props) => {
  const { push_token, loads, last_version_reviewed } = useSelector((state) => {
    const {
      application: { push_token, loads, last_version_reviewed },
    } = state;
    return {
      push_token,
      loads,
      last_version_reviewed,
    };
  }, shallowEqual);
  const currentAppState = useAppState();
  const dispatch = useDispatch();
  // PERMISSIONS && USER ACTIVITY
  const already_handling_ref = React.useRef(false);
  const [, setAllowNotifications] = Helper.useSharedState(
    'allowNotifications',
    false
  );
  React.useEffect(() => {
    if (currentAppState === 'active') {
      (async () => {
        if (already_handling_ref.current === false) {
          already_handling_ref.current = true;
          // always verify permissions
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
          }
          // push_token is null on initial and undefined on rehydrate
          if (!push_token && allowNotifications) {
            // on initial, rehydrate or fail
            dispatch(actions.registerDeviceForNotifications());
          } else {
            dispatch(actions.registerDeviceInteraction());
          }
          already_handling_ref.current = false;
        } else {
          // boot already in progress (prevent multiple permission execution)
          if (__DEV__) {
            console.warn('User activity already in progress');
          }
        }
      })();
    }
  }, [currentAppState]);
  // REQUEST REVIEW
  React.useEffect(() => {
    if (currentAppState === 'active') {
      if (loads >= Settings.MAX_LOADS_FOR_REVIEW) {
        // https://www.raywenderlich.com/9009-requesting-app-ratings-and-reviews-tutorial-for-ios
        const {
          manifest: { version: current_app_version },
        } = Constants;
        if (
          !last_version_reviewed ||
          Helper.isMajorVersion(last_version_reviewed, current_app_version)
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
                      actions.registerApplicationReview(current_app_version)
                    );
                  });
              } else {
                // not supported
              }
            });
          } else {
            if (__DEV__) {
              console.log(
                'No request review allowed when running on virtual device.'
              );
            }
          }
        }
        // }
      } else {
        dispatch(actions.registerApplicationLoad());
      }
    }
  }, [currentAppState]);
  return <Component {...props} />;
};

const withAppUpdateCheck = (Component) => (props) => {
  const {
    manifest: { version: current_app_version },
  } = Constants;
  const { app_version, app_invalid_version, app_ignore_update } = useSelector(
    ({
      application: {
        version: app_version,
        invalid_version: app_invalid_version,
        ignore_update: app_ignore_update,
      },
    }) => ({
      app_version,
      app_invalid_version,
      app_ignore_update,
    }),
    shallowEqual
  );
  const dispatch = useDispatch();
  let ignore_update = false;
  if (app_invalid_version === true && app_ignore_update) {
    // check if expired
    ignore_update =
      app_ignore_update + Settings.APP_IGNORE_UPDATE_EXPIRATION >= Date.now();
  }
  const show_app_update_message =
    app_invalid_version && ignore_update === false;
  React.useEffect(() => {
    if (current_app_version !== app_version) {
      if (__DEV__) {
        console.log('Application updated', app_version, current_app_version);
      }
      // updated and clean app_must_be_updated flag
      dispatch(actions.registerApplicationUpdate(current_app_version));
    }
  }, [current_app_version, app_version]);
  return (
    <Component showAppUpdateMessage={show_app_update_message} {...props} />
  );
};

export default compose(
  // for plain messages
  withContainer(true),
  withFirebase,
  withUserActivity,
  withAppUpdateCheck
)(AppContainer);
