// @ts-nocheck
import AmbitoDolar from '@ambito-dolar/core';
import { compose } from '@reduxjs/toolkit';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import * as _ from 'lodash';
import React from 'react';
import { LogBox } from 'react-native';
import Purchases from 'react-native-purchases';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';

import * as actions from '@/actions';
import withRateUpdates from '@/components/withRateUpdates';
import withRates from '@/components/withRates';
import Settings from '@/config/settings';
import useAppState from '@/hooks/useAppState';
import { useDonationProducts } from '@/hooks/useDonationProducts';
import InitialScreen from '@/screens/InitialScreen';
import Amplitude from '@/utilities/Amplitude';
import DateUtils from '@/utilities/Date';
import { getDonationCooldown, getDonationReAsk } from '@/utilities/Donation';
import Helper from '@/utilities/Helper';
import { goToDonateModal } from '@/utilities/Navigation';
import Sentry from '@/utilities/Sentry';

// dev overlay noise
if (__DEV__) {
  LogBox.ignoreLogs([/\[RevenueCat\]/]);
}

// last usage day the modal was asked for, module scope so a remount does not re-arm it
let donationShownDay = null;

const AppContainer = ({ children, rates, loadingError, fetchRates }) => {
  const hasRates = React.useMemo(() => Helper.isValid(rates), [rates]);
  if (!hasRates) {
    return <InitialScreen {...{ rates, loadingError, fetchRates }} />;
  }
  return children;
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

// a leaf, the tick must not re-render the hoc chain every interval
const UsageDayTick = ({ isActiveAppState }) => {
  const dispatch = useDispatch();
  // TODO: how to handle local store cleaning (use last_day_used / days_used / usages ?)
  const now = Helper.useNow();
  React.useEffect(() => {
    if (isActiveAppState) {
      dispatch(actions.registerApplicationUsageDay());
    }
  }, [now, isActiveAppState, dispatch]);
  return null;
};

const withAppStatistics = (Component) => (props) => {
  const isActiveAppState = useAppState('active');
  const dispatch = useDispatch();
  React.useEffect(() => {
    if (isActiveAppState) {
      dispatch(actions.registerApplicationUsage());
    }
  }, [dispatch, isActiveAppState]);
  return (
    <>
      <UsageDayTick isActiveAppState={isActiveAppState} />
      <Component {...props} />
    </>
  );
};

Notifications.setNotificationHandler({
  handleNotification: () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
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
  const setAllowNotifications = Helper.useSharedSetter('allowNotifications');
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
  }, [dispatch, isActiveAppState]);
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
  const setPurchasesConfigured = Helper.useSharedSetter('purchasesConfigured');
  const installationId = props.installationId;
  React.useEffect(() => {
    try {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
      Purchases.configure({
        apiKey: Settings.REVENUECAT_API_KEY,
        appUserID: installationId,
      });
      setPurchasesConfigured(true);
    } catch (e) {
      console.warn(e);
    }
  }, [installationId, setPurchasesConfigured]);
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
    return <Component {...props} key={reloadKey} />;
  }
};

const withAppDonation = (Component) => (props) => {
  const [purchasesConfigured] = Helper.useSharedState(
    'purchasesConfigured',
    false,
  );
  const { daysUsed, ignoreDonationDaysUsed, ignoreDonationCount } = useSelector(
    ({
      application: {
        days_used: daysUsed,
        ignore_donation_days_used: ignoreDonationDaysUsed,
        ignore_donation_count: ignoreDonationCount,
      },
    }) => ({
      daysUsed,
      ignoreDonationDaysUsed,
      ignoreDonationCount,
    }),
    shallowEqual,
  );
  const {
    products: donationProducts,
    priceMap,
    ensureProducts,
  } = useDonationProducts();
  // a failed boot fetch changes no dep, the next foreground retries it
  // here and not in the hook, every screen using it would re-render on each app state change
  const isActive = useAppState('active');
  React.useEffect(() => {
    if (isActive && purchasesConfigured && !donationProducts.length) {
      ensureProducts();
    }
  }, [isActive, purchasesConfigured, donationProducts.length, ensureProducts]);
  const [appDonationModal] = Helper.useSharedState('appDonationModal', false);
  // the initial screen mounts no navigator, the route would never open
  const hasRates = Helper.isValid(props.rates);
  React.useEffect(() => {
    if (!hasRates || !purchasesConfigured || !donationProducts.length) {
      return;
    }
    const forced = !!appDonationModal;
    const cooldown = getDonationCooldown(
      daysUsed,
      ignoreDonationDaysUsed,
      ignoreDonationCount,
    );
    if (!forced && !cooldown.due) {
      Helper.debug('💖 Donation not due', {
        daysUsed,
        ignoreDonationDaysUsed,
        ignoreDonationCount,
        cooldownDays: cooldown.cooldownDays,
        elapsedDays: cooldown.elapsedDays,
      });
      return;
    }
    if (!forced && donationShownDay === daysUsed) {
      Helper.debug('💖 Donation already asked today', { daysUsed });
      return;
    }
    // a dep change or an unmount drops a check left in flight
    let cancelled = false;
    Purchases.getCustomerInfo()
      .then((customerInfo) => {
        const reAsk = getDonationReAsk(customerInfo, priceMap);
        if (!(forced || reAsk.due) || cancelled) {
          Helper.debug('💖 Donation skipped', {
            lastPurchaseAt: Helper.formatTimestamp(reAsk.lastPurchaseDate),
            lifetimeTotal: reAsk.lifetimeTotal,
            reAsk: AmbitoDolar.formatDuration(reAsk.reAskMs),
            cancelled,
          });
          return;
        }
        Helper.debug('💖 Donation modal shown', {
          daysUsed,
          ignoreDonationCount,
          forced,
        });
        donationShownDay = daysUsed;
        goToDonateModal();
      })
      .catch(console.warn);
    return () => {
      cancelled = true;
    };
  }, [
    hasRates,
    purchasesConfigured,
    donationProducts,
    daysUsed,
    ignoreDonationDaysUsed,
    ignoreDonationCount,
    appDonationModal,
  ]);
  return <Component {...props} />;
};

export default compose(
  withRates(),
  withAppIdentifier,
  withRateUpdates,
  withAppUpdateCheck,
  withAppStatistics,
  withUserActivity,
  withPurchases,
  withLocalization,
  withAppDonation,
)(AppContainer);
