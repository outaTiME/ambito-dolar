// @ts-nocheck
import AmbitoDolar from '@ambito-dolar/core';
import {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetModal,
} from '@gorhom/bottom-sheet';
import { compose } from '@reduxjs/toolkit';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import * as _ from 'lodash';
import React from 'react';
import { LogBox, View, Text } from 'react-native';
import Purchases from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';

import * as actions from '@/actions';
import ActionButton from '@/components/ActionButton';
import withRateUpdates from '@/components/withRateUpdates';
import withRates from '@/components/withRates';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import useAppState from '@/hooks/useAppState';
import { useDonationProducts } from '@/hooks/useDonationProducts';
import InitialScreen from '@/screens/InitialScreen';
import Amplitude from '@/utilities/Amplitude';
import DateUtils from '@/utilities/Date';
import {
  computeLifetime,
  formatProductPrice,
  getCooldownDays,
  getReAskMs,
  purchaseDonation,
  showPurchaseErrorAlert,
} from '@/utilities/Donation';
import Helper from '@/utilities/Helper';
import { goToDonateModal } from '@/utilities/Navigation';
import Sentry from '@/utilities/Sentry';

// dev overlay noise, the reanimated one is @gorhom/bottom-sheet issue #2758
if (__DEV__) {
  LogBox.ignoreLogs([
    /\[RevenueCat\]/,
    /\[Reanimated\] dependencies should only be used/,
  ]);
}

const DONATION_PURCHASE_SLUGS = [
  '¡Wow, usás {APP_NAME} un montón!',
  '¡Increíble lo fiel que sos a {APP_NAME}!',
  '¡Wow, no parás de entrar a {APP_NAME}!',
  '¡{APP_NAME} ya es parte de tu rutina diaria!',
  '¡Siempre con {APP_NAME} a mano!',
  '¡Sos inseparable de {APP_NAME}!',
  '¡No pasás un día sin mirar {APP_NAME}!',
  '¡Wow, abrís {APP_NAME} a cada rato!',
  '¡No te despegás de {APP_NAME} ni un segundo!',
  '¡Wow, no hay descanso entre vos y {APP_NAME}!',
  '¡Ya sos usuario nivel experto de {APP_NAME}!',
  '¡No hay quien te gane usando {APP_NAME}!',
];

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

const withAppStatistics = (Component) => (props) => {
  const isActiveAppState = useAppState('active');
  const dispatch = useDispatch();
  // TODO: how to handle local store cleaning (use last_day_used / days_used / usages ?)
  const now = Helper.useNow();
  React.useEffect(() => {
    if (isActiveAppState) {
      dispatch(actions.registerApplicationUsageDay());
    }
  }, [now, isActiveAppState, dispatch]);
  React.useEffect(() => {
    if (isActiveAppState) {
      dispatch(actions.registerApplicationUsage());
    }
  }, [dispatch, isActiveAppState]);
  return <Component {...props} />;
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
  const [, setPurchasesConfigured] = Helper.useSharedState(
    'purchasesConfigured',
    false,
  );
  const installationId = props.installationId;
  React.useEffect(() => {
    const configure = async () => {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
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
  const { products: donationProducts, priceMap } = useDonationProducts();
  const purchaseSlug = React.useMemo(
    () =>
      _.replace(
        DONATION_PURCHASE_SLUGS[daysUsed % DONATION_PURCHASE_SLUGS.length],
        '{APP_NAME}',
        Settings.APP_NAME,
      ),
    [daysUsed],
  );
  const bottomSheetRef = React.useRef();
  const [appDonationModal, setAppDonationModal] = Helper.useSharedState(
    'appDonationModal',
    false,
  );
  // shared with the native formSheet route (packages/client/app/donate.tsx)
  const [, setDonationSlug] = Helper.useSharedState('donationSlug');
  // the open on screen came from the developer screen
  const forcedRef = React.useRef(false);
  // this presentation ended in a purchase, reset when the next one opens
  const donatedRef = React.useRef(false);
  // mirrors loadingProductId so dismiss callbacks see the latest value
  const loadingRef = React.useRef(false);
  React.useEffect(() => {
    if (!purchasesConfigured || !donationProducts?.length) {
      return;
    }
    const forced = !!appDonationModal;
    const cooldownDays = getCooldownDays(ignoreDonationCount);
    const elapsedDays = Math.max(0, daysUsed - (ignoreDonationDaysUsed ?? 0));
    const shouldShowModal = forced || elapsedDays >= cooldownDays;
    if (!shouldShowModal) {
      Helper.debug('💖 Donation not due', {
        daysUsed,
        ignoreDonationDaysUsed,
        ignoreDonationCount,
        cooldownDays,
        elapsedDays,
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
        // server time of the snapshot, a cached one only delays the ask
        const now = Date.parse(customerInfo?.requestDate) || Date.now();
        const transactions = customerInfo?.nonSubscriptionTransactions ?? [];
        const lastPurchaseDate = _.last(transactions)?.purchaseDate;
        const lifetimeTotal = computeLifetime(transactions, priceMap);
        const elapsedSinceLast = lastPurchaseDate
          ? now - new Date(lastPurchaseDate).getTime()
          : Infinity;
        const reAskMs = lastPurchaseDate ? getReAskMs(lifetimeTotal) : null;
        const shouldAsk =
          forced || !lastPurchaseDate || elapsedSinceLast >= reAskMs;
        if (!shouldAsk || cancelled) {
          Helper.debug('💖 Donation skipped', {
            lastPurchaseAt: Helper.formatTimestamp(lastPurchaseDate),
            lifetimeTotal,
            reAsk: AmbitoDolar.formatDuration(reAskMs),
            cancelled,
          });
          return;
        }
        Helper.debug('💖 Donation modal shown', {
          daysUsed,
          ignoreDonationCount,
          forced,
          native: !!Settings.USE_NATIVE_DONATION_SHEET,
        });
        donationShownDay = daysUsed;
        // a forced open stays forced until it is dismissed
        // an automatic check crossing a usage day must not downgrade it
        if (forced) {
          forcedRef.current = true;
        }
        if (Settings.USE_NATIVE_DONATION_SHEET) {
          setDonationSlug(purchaseSlug);
          goToDonateModal();
        } else {
          // spend the trigger here, a dismiss that never fires would leave it armed
          if (forced) {
            setAppDonationModal(false);
          }
          donatedRef.current = false;
          bottomSheetRef.current?.present();
        }
      })
      .catch(console.warn);
    return () => {
      cancelled = true;
    };
  }, [
    purchasesConfigured,
    donationProducts,
    daysUsed,
    ignoreDonationDaysUsed,
    ignoreDonationCount,
    appDonationModal,
  ]);
  const renderBackdrop = React.useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );
  const dispatch = useDispatch();
  // onChange skips a close that interrupts the opening animation, teardown always reaches this one
  const handleDismiss = React.useCallback(() => {
    const forcedOpen = forcedRef.current;
    forcedRef.current = false;
    const donated = donatedRef.current;
    const loading = loadingRef.current;
    // the other half of the check above, it says whether the dismiss spent the cooldown
    Helper.debug('💖 Donation dismissed', { forcedOpen, donated, loading });
    // purchase in flight resolves on its own, skip ignore dispatch
    if (donated || loading) {
      return;
    }
    // a forced open must not spend the cooldown
    if (!forcedOpen) {
      dispatch(actions.ignoreApplicationDonation());
    }
  }, [dispatch]);
  const safeAreaInsets = useSafeAreaInsets();
  const colorScheme = 'light';
  const { fonts } = Helper.useTheme(colorScheme);
  const [loadingProductId, setLoadingProductId] = React.useState(null);
  const handleDonate = React.useCallback(
    async (product, productId) => {
      setLoadingProductId(productId);
      loadingRef.current = true;
      try {
        await purchaseDonation(product);
        donatedRef.current = true;
        dispatch(actions.registerApplicationDonation());
        bottomSheetRef.current?.dismiss();
      } catch (e) {
        showPurchaseErrorAlert(e);
      } finally {
        setLoadingProductId(null);
        loadingRef.current = false;
      }
    },
    [dispatch],
  );
  return (
    <>
      <Component {...props} />
      <BottomSheetModal
        ref={bottomSheetRef}
        detached
        enablePanDownToClose
        style={{
          marginLeft: (Settings.DEVICE_WIDTH - Settings.CONTENT_WIDTH) / 2,
          width: Settings.CONTENT_WIDTH,
        }}
        backgroundStyle={{
          marginHorizontal: Settings.CONTENT_MARGIN * 2,
          // borderRadius: Settings.BORDER_RADIUS,
        }}
        bottomInset={safeAreaInsets.bottom + Settings.CONTENT_MARGIN * 2}
        onDismiss={handleDismiss}
        handleComponent={null}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView>
          <View
            style={{
              marginHorizontal: Settings.CONTENT_MARGIN * 2,
              padding: Settings.PADDING * 2,
              alignItems: 'center',
            }}
          >
            <Text
              style={[
                fonts.extraLargeTitle,
                { paddingHorizontal: Settings.PADDING / 2 },
              ]}
            >
              🥰
            </Text>
            <Text
              style={[
                fonts.body,
                {
                  textAlign: 'center',
                  paddingVertical: Settings.PADDING * 2,
                },
              ]}
            >
              {`${purchaseSlug}\n\n${I18n.t('donate_modal_note')}`}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: Settings.PADDING,
              }}
            >
              {donationProducts.map((product, index) => {
                const productId = product?.identifier ?? `product_${index}`;
                return (
                  <ActionButton
                    key={productId}
                    title={formatProductPrice(product)}
                    handleOnPress={
                      loadingProductId === null
                        ? () => handleDonate(product, productId)
                        : undefined
                    }
                    alternativeBackground
                    loading={loadingProductId === productId}
                  />
                );
              })}
            </View>
            <ActionButton
              borderless
              title={I18n.t('not_now')}
              handleOnPress={
                loadingProductId === null
                  ? () => {
                      bottomSheetRef.current?.dismiss();
                    }
                  : undefined
              }
              colorScheme
              style={{ marginTop: Settings.PADDING * 2 }}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
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
