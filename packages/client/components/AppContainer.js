import AmbitoDolar from '@ambito-dolar/core';
import MaterialCommunityIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/MaterialCommunityIcons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import {
  createBottomTabNavigator,
  BottomTabBar,
} from '@react-navigation/bottom-tabs';
import { HeaderShownContext } from '@react-navigation/elements';
import { NavigationContainer, useTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { compose } from '@reduxjs/toolkit';
import { BlurView } from 'expo-blur';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { useQuickAction } from 'expo-quick-actions/hooks';
import * as StoreReview from 'expo-store-review';
// import { initializeApp } from 'firebase/app';
// import { getDatabase, ref, onValue } from 'firebase/database';
import * as _ from 'lodash';
import React from 'react';
import { StyleSheet, Platform, View, Text, Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { useStateWithCallbackLazy } from 'use-state-with-callback';

import ActionButton from './ActionButton';
import { MaterialHeaderButtons, Item } from './HeaderButtons';
import Toast from './Toast';
import ToastPositionContainer from './ToastPositionContainer';
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
import RateWidgetPreviewScreen from '../screens/RateWidgetPreviewScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import Amplitude from '../utilities/Amplitude';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';
import Sentry from '../utilities/Sentry';
import { reloadWidgets } from '../widgets';

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

// for android market capture purposes
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

const useNavigatorScreenOptions = (modal = false) => {
  const { theme, fonts } = Helper.useTheme();
  const { colors } = useTheme();
  return {
    headerBackVisible: false,
    headerShadowVisible: false,
    headerTitleAlign: 'center',
    headerTitleStyle: fonts.title,
    ...Platform.select({
      ios: {
        ...(!BLUR_EFFECT_ON_NAVIGATION_BARS
          ? {
              headerStyle: { backgroundColor: colors.card },
            }
          : {
              headerBlurEffect: modal
                ? `systemMaterial${AmbitoDolar.getCapitalized(theme)}`
                : theme,
            }),
        headerTransparent: true,
      },
      android: {
        // pass
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
      <SettingsStack.Screen
        name="RateWidgetPreview"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('rate_widget')),
          headerLeft: () => <BackButton {...{ navigation }} />,
        })}
        component={RateWidgetPreviewScreen}
      />
    </SettingsStack.Navigator>
  );
};

const ToastBottomTabBar = (props) => {
  const tabBarHeight = Helper.getTabBarHeight(props.insets);
  const [activityToast, setActivityToast] =
    Helper.useSharedState('activityToast');
  const [activeToast, setActiveToast] = React.useState();
  React.useEffect(() => {
    if (activityToast) {
      // show only once per update
      setActivityToast(null);
      if (!activeToast?.isVisible) {
        setActiveToast({
          isVisible: true,
          ...activityToast,
        });
        activityToast.feedback &&
          Settings.HAPTICS_ENABLED &&
          Haptics.notificationAsync();
        setTimeout(() => {
          setActiveToast({
            isVisible: false,
            ...activityToast,
          });
        }, 2 * 1000);
      }
    }
  }, [activityToast]);
  return (
    <>
      <ToastPositionContainer height={tabBarHeight}>
        <Toast isVisible={activeToast?.isVisible} text={activeToast?.message} />
      </ToastPositionContainer>
      <BottomTabBar {...props} />
    </>
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
        tabBarStyle: {
          ...(Platform.OS === 'ios' && {
            position: 'absolute',
          }),
          // https://github.com/react-navigation/react-navigation/blob/6.x/packages/bottom-tabs/src/views/BottomTabBar.tsx#L385
          borderTopWidth: 0,
          elevation: 0,
        },
        ...Platform.select({
          ios: {
            tabBarBackground,
          },
          android: {
            // pass
          },
        }),
      }}
      tabBar={(props) => <ToastBottomTabBar {...props} />}
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
              // name="filter-outline"
              name="swap-horizontal-variant"
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

const RootStack = createNativeStackNavigator();
const AppContainer = ({ rates, rateTypes, stillLoading }) => {
  const { theme } = Helper.useTheme();
  // https://reactnavigation.org/docs/navigating-without-navigation-prop/#handling-initialization
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
  const quickAction = useQuickAction();
  React.useEffect(() => {
    if (quickAction) {
      Helper.debug('🎯 Quick action received', quickAction);
      const type = quickAction?.id;
      if (type) {
        Amplitude.track('Quick action', { type });
        navigationRef.navigate(`${type}Tab`, {
          screen: type,
          params: {
            focus: true,
          },
        });
      }
    }
  }, [quickAction]);
  // DEEP LINK
  const onDeepLink = React.useCallback((url) => {
    if (url) {
      const { hostname: route, queryParams: params } = Linking.parse(url);
      Helper.debug('🎯 Deep link received', url, route, params);
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
    Linking.getInitialURL().then(onDeepLink).catch(console.warn);
    const subscription = Linking.addEventListener('url', ({ url }) =>
      onDeepLink(url),
    );
    return () => subscription.remove();
  }, []);
  const onStateChange = React.useCallback(() => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.getCurrentRoute().name;
    if (previousRouteName !== currentRouteName) {
      Helper.debug('👀 Track screen', currentRouteName);
      Sentry.addBreadcrumb({
        message: `${currentRouteName} screen`,
      });
      Amplitude.track(`${currentRouteName} screen`);
    }
    // save the current route name for later comparision
    routeNameRef.current = currentRouteName;
  }, []);
  const hasRates = React.useMemo(() => Helper.isValid(rates), [rates]);
  const navigationTheme = React.useMemo(
    () => ({
      dark: theme === 'dark',
      colors: {
        card: !hasRates
          ? Settings.getBackgroundColor(theme, true)
          : Settings.getContentColor(theme),
        border: Settings.getSeparatorColor(theme),
      },
    }),
    [theme, hasRates],
  );
  const navigatorScreenOptions = useNavigatorScreenOptions();
  const navigationBarColor = navigationTheme.colors.card;
  const statusBarStyle = Helper.getInvertedTheme(theme);
  let content = (
    <NavigationContainer
      {...{
        ref: navigationRef,
        // track initial screen
        onReady: onStateChange,
        onStateChange,
        theme: navigationTheme,
      }}
    >
      <RootStack.Navigator
        screenOptions={{
          ...navigatorScreenOptions,
          headerShown: false,
          navigationBarColor,
          statusBarStyle,
          statusBarTranslucent: true,
        }}
      >
        {!hasRates ? (
          <RootStack.Screen name={Settings.INITIAL_ROUTE_NAME}>
            {(props) => (
              <InitialScreen
                {...{
                  ...props,
                  rates,
                  stillLoading,
                }}
              />
            )}
          </RootStack.Screen>
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
  // https://github.com/react-navigation/react-navigation/issues/11353#issuecomment-1588570491
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'android') {
    content = (
      <View
        style={{
          flex: 1,
          backgroundColor: navigationBarColor,
          paddingTop: insets.top,
        }}
      >
        <HeaderShownContext.Provider value>
          {content}
        </HeaderShownContext.Provider>
      </View>
    );
  }
  return content;
};

const withAppIdentifier = (Component) => (props) => {
  const installationId = useSelector(
    (state) => state.application.installation_id,
  );
  return (
    <Component
      {...{
        ...props,
        installationId,
      }}
    />
  );
};

const db = Helper.getInstantDB();

const withRealtime = (Component) => (props) => {
  const dispatch = useDispatch();
  const [stillLoading, setStillLoading] = React.useState(false);
  const stillLoadingRef = React.useRef();
  const updateLocalRates = React.useCallback(
    (rates) => {
      Helper.debug('💫 Updating local rates', { withRates: !!rates });
      return Promise.resolve(rates ?? Helper.getRates())
        .then((data) => {
          dispatch(actions.addRates(data));
          dispatch(actions.registerApplicationDownloadRates());
          // force reload of widgets
          WidgetKit.reloadAllTimelines();
          reloadWidgets(data);
        })
        .catch(console.warn);
    },
    [dispatch],
  );
  // UPDATE CHECK
  const updatedAt = useSelector((state) => state.rates.updated_at);
  const updatedAtRef = React.useRef(updatedAt);
  const [forceUpdate, setForceUpdate] = React.useState();
  React.useEffect(() => {
    if (updatedAtRef.current && !updatedAt) {
      // force re-render when clear rates
      Helper.debug('💨 Store cleared');
      setForceUpdate(Date.now());
    }
    updatedAtRef.current = updatedAt;
  }, [updatedAt]);
  const isActiveAppState = useAppState('active');
  const { isLocal, isLoading, data } = db
    ? db.useQuery(
        // force disconnect when app goes to background
        isActiveAppState && {
          boards: {
            $: {
              // avoid fixed record identifier
              limit: 1,
            },
          },
        },
      )
    : {
        // no real-time updates
        isLocal: true,
      };
  const timeInForeground = React.useRef();
  React.useEffect(() => {
    if (isActiveAppState) {
      // app comes from background
      timeInForeground.current = Date.now();
    }
  }, [isActiveAppState]);
  const showUpdateToastRef = Helper.useSelectorRef(
    (state) => state.application.show_update_toast,
  );
  const showActivityToast = Helper.useActivityToast();
  React.useEffect(() => {
    if (!isLocal) {
      if (isLoading) {
        // only for initial load
        setStillLoading(false);
        stillLoadingRef.current = setTimeout(() => {
          setStillLoading(true);
        }, Settings.STILL_LOADING_TIMEOUT);
      } else {
        const board = data?.boards?.[0]?.data;
        if (board) {
          const updated_at = board.updated_at;
          if (updated_at !== updatedAtRef.current) {
            Sentry.addBreadcrumb({
              message: 'Instant update event',
              data: updated_at,
            });
            // show toast when update is within 10s of app in foreground (skip on init)
            const shouldShowToast =
              updatedAtRef.current &&
              timeInForeground.current &&
              DateUtils.get().diff(timeInForeground.current, 'milliseconds') <=
                Settings.STILL_LOADING_TIMEOUT;
            Helper.debug(
              '⚡️ Instant updated',
              updated_at,
              updatedAtRef.current,
              shouldShowToast,
            );
            Promise.resolve(
              // only for initial load or when clear rates
              !updatedAtRef.current && Helper.delay(),
            )
              .then(() => updateLocalRates(board))
              .then(() => {
                if (shouldShowToast) {
                  showUpdateToastRef.current !== false &&
                    showActivityToast(I18n.t('rates_updated'), true);
                  // force a single toast per app foreground entry
                  timeInForeground.current = null;
                }
              })
              .finally(() => {
                // initial load completed
                clearTimeout(stillLoadingRef.current);
              });
          } else {
            Helper.debug('✅ Rates already updated', updated_at);
          }
        } else {
          // silent fail
        }
      }
    } else {
      Helper.debug('❄️ No real-time updates');
      updateLocalRates();
    }
  }, [isLocal, isLoading, data, forceUpdate]);
  return (
    <Component
      {...{
        ...props,
        stillLoading,
      }}
    />
  );
};

const withAppUpdateCheck = (Component) => (props) => {
  const version = useSelector((state) => state.application.version);
  const dispatch = useDispatch();
  React.useEffect(() => {
    if (Settings.APP_VERSION !== version) {
      Helper.debug('⚡️ Application updated', Settings.APP_VERSION, version);
      dispatch(actions.registerApplicationUpdate(Settings.APP_VERSION));
    } else {
      Helper.debug('✅ Application already updated', version);
    }
  }, [dispatch, version]);
  return <Component {...props} />;
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
                    allowSound: true,
                    allowDisplayInCarPlay: true,
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
              Helper.debug(
                'Device is already registered to receive notifications',
                pushToken,
              );
            } else {
              // sending push token or notifications were disabled
            }
          } else {
            Helper.debug('Notifications are not allowed on virtual devices');
          }
          alreadyHandlingRef.current = false;
        } else {
          // boot already in progress (prevent multiple permission execution)
          Helper.debug('User activity already in progress');
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
          Helper.debug('Store review are not allowed on virtual device');
        }
      }
    }
  }, [
    dispatch,
    isActiveAppState /* , appUpdated, lastVersionReviewed, version */,
  ]);
  // HANDLE ERRORS AND SUPPORT
  const installationId = props.installationId;
  React.useEffect(() => {
    // same identifier for cross-platform mapping
    Sentry.setUserContext({
      id: installationId,
    });
    Amplitude.setUserId(installationId);
  }, [installationId]);
  return <Component {...props} />;
};

const withPurchases = (Component) => (props) => {
  const [, setPurchasesConfigured] = Helper.useSharedState(
    'purchasesConfigured',
    false,
  );
  const installationId = props.installationId;
  React.useEffect(() => {
    const configure = async () => {
      __DEV__ && (await Purchases.setLogLevel(Purchases.LOG_LEVEL.VERBOSE));
      Purchases.configure({
        apiKey: Settings.REVENUECAT_API_KEY,
        appUserID: installationId,
      });
    };
    configure()
      .then(() => {
        setPurchasesConfigured(true);
      })
      .catch(console.warn);
  }, [installationId]);
  return <Component {...props} />;
};

const withLocalization = (Component) => (props) => {
  const [reloadKey, setReloadKey] = React.useState();
  const isActiveAppState = useAppState('active');
  const activeLocale = React.useRef();
  const activeCalendar = React.useRef();
  React.useEffect(() => {
    if (isActiveAppState) {
      // reloadKey will have a value (in this scope) on the next app foreground entry
      let forceReload = !reloadKey;
      const locales = Localization.getLocales();
      const locale = locales?.[0];
      if (!_.isEqual(locale, activeLocale.current)) {
        AmbitoDolar.setDelimiters({
          thousands: locale?.digitGroupingSeparator,
          decimal: locale?.decimalSeparator,
        });
        Helper.debug('💫 User locale updated', locale);
        activeLocale.current = locale;
        forceReload = true;
      }
      const calendars = Localization.getCalendars();
      const calendar = calendars?.[0];
      if (!_.isEqual(calendar, activeCalendar.current)) {
        Helper.debug('💫 User calendar updated', calendar);
        activeCalendar.current = calendar;
        forceReload = true;
      }
      if (forceReload === true) {
        setReloadKey(Date.now());
      }
    }
  }, [isActiveAppState]);
  if (reloadKey) {
    return (
      <Component
        {...{
          ...props,
          key: reloadKey,
        }}
      />
    );
  }
};

const withAppDonation = (Component) => (props) => {
  const [purchasesConfigured] = Helper.useSharedState(
    'purchasesConfigured',
    false,
  );
  const { daysUsed, ignoreDonation } = useSelector(
    ({
      application: { days_used: daysUsed, ignore_donation: ignoreDonation },
    }) => ({
      daysUsed,
      ignoreDonation,
    }),
    shallowEqual,
  );
  const THRESHOLD_DAYS_USE = 30;
  const purchaseSlug = React.useMemo(() => {
    const slugs = [
      '¡Wow, usás {APP_NAME} un montón!',
      '¡Increíble cómo usás {APP_NAME}!',
      '¡No parás de usar {APP_NAME}!',
      '¡{APP_NAME} es parte de tu rutina diaria!',
      '¡Estás todo el tiempo en {APP_NAME}!',
      '¡Sos inseparable de {APP_NAME}!',
      '¡No hay día sin {APP_NAME}!',
      '¡Wow, usás {APP_NAME} sin parar!',
      '¡No te despegás de {APP_NAME} ni un segundo!',
      '¡Wow, abrís {APP_NAME} a cada rato!',
    ];
    return _.replace(
      slugs[daysUsed % slugs.length],
      '{APP_NAME}',
      Settings.APP_NAME,
    );
  }, [daysUsed]);
  const [purchaseProduct, setPurchaseProduct] = useStateWithCallbackLazy();
  const bottomSheetRef = React.useRef();
  const [appDonationModal, setAppDonationModal] = Helper.useSharedState(
    'appDonationModal',
    false,
  );
  React.useEffect(() => {
    if (purchasesConfigured) {
      let shouldShowModal = daysUsed >= THRESHOLD_DAYS_USE;
      if (ignoreDonation) {
        // check between THRESHOLD_DAYS_USE
        shouldShowModal =
          Date.now() >=
          ignoreDonation + THRESHOLD_DAYS_USE * 24 * 60 * 60 * 1000;
      }
      shouldShowModal = appDonationModal || shouldShowModal;
      if (shouldShowModal) {
        Purchases.getCustomerInfo()
          .then(async (customerInfo) => {
            const lastPurchaseDate = _.last(
              customerInfo?.nonSubscriptionTransactions,
            )?.purchaseDate;
            const monthsSinceLastPurchase = DateUtils.get().diff(
              lastPurchaseDate,
              'months',
            );
            let product;
            if (
              appDonationModal ||
              !lastPurchaseDate ||
              // ask for donation once a year (since last donation)
              monthsSinceLastPurchase >= 12
            ) {
              product = await Helper.timeout(
                Purchases.getProducts(
                  ['small_contribution'],
                  Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
                ),
              ).then((products) => products?.[0]);
              // .then((product) => product ?? (__DEV__ && { price: 1 }));
            }
            return [lastPurchaseDate, monthsSinceLastPurchase, product];
          })
          .catch(console.warn)
          .then(([lastPurchaseDate, monthsSinceLastPurchase, product] = []) => {
            Helper.debug('💖 Donation modal may be required', {
              daysUsed,
              ignoreDonation,
              forced: !!appDonationModal,
              lastPurchaseDate,
              monthsSinceLastPurchase,
              product: !!product,
            });
            setPurchaseProduct(product, (product) => {
              // run after modal re-rendering
              if (product) {
                bottomSheetRef.current?.expand();
              }
            });
          });
      } else {
        Helper.debug('💖 Donation modal not required', {
          daysUsed,
          ignoreDonation,
          forced: !!appDonationModal,
        });
      }
    }
  }, [purchasesConfigured, daysUsed, ignoreDonation, appDonationModal]);
  const renderBackdrop = React.useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="none"
      />
    ),
    [],
  );
  const dispatch = useDispatch();
  const handleSheetChanges = React.useCallback(
    (index) => {
      if (index === -1) {
        if (appDonationModal) {
          setAppDonationModal(false);
        } else {
          dispatch(actions.ignoreApplicationDonation());
        }
      }
    },
    [appDonationModal],
  );
  const safeAreaInsets = useSafeAreaInsets();
  // force light
  const colorScheme = 'light';
  const { fonts } = Helper.useTheme(colorScheme);
  const [donateLoading, setDonateLoading] = React.useState(false);
  return (
    <>
      <Component {...props} />
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        detached
        animateOnMount={false}
        style={{
          marginLeft: (Settings.DEVICE_WIDTH - Settings.CONTENT_WIDTH) / 2,
          width: Settings.CONTENT_WIDTH,
        }}
        backgroundStyle={{
          marginHorizontal: Settings.CARD_PADDING * 2,
        }}
        bottomInset={safeAreaInsets.bottom || Settings.CARD_PADDING * 2}
        onChange={handleSheetChanges}
        handleComponent={null}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView>
          <View
            style={{
              marginHorizontal: Settings.CARD_PADDING * 2,
              padding: Settings.PADDING * 2,
              alignItems: 'center',
            }}
          >
            <Text style={[fonts.extraLargeTitle]}>🥰</Text>
            <Text
              style={[
                fonts.body,
                {
                  textAlign: 'center',
                  paddingVertical: Settings.PADDING * 2,
                },
              ]}
            >
              {`${purchaseSlug}\n\n${I18n.t('opts_support_note')}`}
            </Text>
            <ActionButton
              title={[
                I18n.t('donate'),
                Helper.getCurrency(purchaseProduct?.price, true, true),
              ].join(' ')}
              handleOnPress={async () => {
                setDonateLoading(true);
                try {
                  await Purchases.purchaseStoreProduct(purchaseProduct);
                  bottomSheetRef.current?.close();
                } catch (e) {
                  if (!e.userCancelled) {
                    Sentry.captureException(
                      new Error('Purchase error', { cause: e }),
                    );
                    Alert.alert(
                      I18n.t('generic_error'),
                      '',
                      [
                        {
                          text: I18n.t('accept'),
                          onPress: () => {
                            // pass
                          },
                        },
                      ],
                      {
                        cancelable: false,
                      },
                    );
                  }
                } finally {
                  setDonateLoading(false);
                }
              }}
              style={{
                marginVertical: Settings.PADDING,
              }}
              alternativeBackground
              // colorScheme
              loading={donateLoading}
            />
            <ActionButton
              borderless
              title="Ahora no"
              handleOnPress={() => {
                bottomSheetRef.current?.close();
              }}
              colorScheme
            />
          </View>
        </BottomSheetView>
      </BottomSheet>
    </>
  );
};

export default compose(
  withContainer,
  withRates(),
  withAppIdentifier,
  withRealtime,
  withAppUpdateCheck,
  withAppStatistics,
  withUserActivity,
  withPurchases,
  withLocalization,
  withAppDonation,
)(AppContainer);
