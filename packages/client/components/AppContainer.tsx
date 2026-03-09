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
import { View, Text, Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { useStateWithCallbackLazy } from 'use-state-with-callback';

import * as actions from '@/actions';
import ActionButton from '@/components/ActionButton';
import withRates from '@/components/withRates';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import useAppState from '@/hooks/useAppState';
import * as WidgetKit from '@/modules/widgetkit';
import InitialScreen from '@/screens/InitialScreen';
import Amplitude from '@/utilities/Amplitude';
import DateUtils from '@/utilities/Date';
import Helper from '@/utilities/Helper';
import Sentry from '@/utilities/Sentry';
import { reloadWidgets } from '@/widgets';

const AppContainer = ({ children, rates, stillLoading = false }) => {
  const hasRates = React.useMemo(() => Helper.isValid(rates), [rates]);
  if (!hasRates) {
    return <InitialScreen rates={rates} stillLoading={stillLoading} />;
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
        clearTimeout(stillLoadingRef.current);
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
                // initial load completed
                setStillLoading(false);
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
      setStillLoading(false);
      clearTimeout(stillLoadingRef.current);
      updateLocalRates();
    }
  }, [isLocal, isLoading, data, forceUpdate, updateLocalRates]);
  React.useEffect(() => {
    return () => {
      clearTimeout(stillLoadingRef.current);
      setStillLoading(false);
    };
  }, []);
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
    return <Component {...props} key={reloadKey} />;
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
        Helper.promiseRetry((retry) => Purchases.getCustomerInfo().catch(retry))
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
              product = await Helper.promiseRetry((retry) =>
                Purchases.getProducts(
                  ['small_contribution'],
                  Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
                )
                  .then((products) => products?.[0])
                  .catch(retry),
              );
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
                bottomSheetRef.current?.present();
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
      <BottomSheetModal
        ref={bottomSheetRef}
        detached
        enablePanDownToClose={false}
        style={{
          marginLeft: (Settings.DEVICE_WIDTH - Settings.CONTENT_WIDTH) / 2,
          width: Settings.CONTENT_WIDTH,
        }}
        backgroundStyle={{
          marginHorizontal: Settings.CARD_PADDING * 2,
          // borderRadius: Settings.BORDER_RADIUS,
        }}
        bottomInset={safeAreaInsets.bottom + Settings.CARD_PADDING * 2}
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
                  await Helper.promiseRetry((retry) =>
                    Purchases.purchaseStoreProduct(purchaseProduct).catch(
                      (e) => {
                        // do not retry if user cancelled
                        if (e?.userCancelled) {
                          throw e;
                        }
                        retry(e);
                      },
                    ),
                  );
                  bottomSheetRef.current?.dismiss();
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
                bottomSheetRef.current?.dismiss();
              }}
              colorScheme
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
  withRealtime,
  withAppUpdateCheck,
  withAppStatistics,
  withUserActivity,
  withPurchases,
  withLocalization,
  withAppDonation,
)(AppContainer);
