// @ts-nocheck
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import * as actions from '@/actions';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import useAppState from '@/hooks/useAppState';
import * as WidgetKit from '@/modules/widgetkit';
import { reloadWidgets } from '@/modules/widgets';
import Helper from '@/utilities/Helper';
import Sentry from '@/utilities/Sentry';

// absorbs the tick drift, a flat 30s so a foreground entry can refresh early
const SLACK = Settings.RATES_REFRESH_INTERVAL / 2;

const withRateUpdates = (Component) => (props) => {
  const dispatch = useDispatch();
  const [loadingError, setLoadingError] = React.useState(false);
  const inFlightRef = React.useRef(false);
  const failedRef = React.useRef(false);
  const lastFetchAtRef = React.useRef();
  const updatedAt = useSelector((state) => state.rates.updated_at);
  const updatedAtRef = React.useRef(updatedAt);
  const timeInForeground = React.useRef();
  const showUpdateToastRef = Helper.useSelectorRef(
    (state) => state.application.show_update_toast,
  );
  const showActivityToast = Helper.useActivityToast();
  const isOpenRef = Helper.useSelectorRef((state) => state.rates.is_open);
  // not deeper, withLocalization renders nothing at first
  // the tick stops exactly where the retry button takes over, same test AppContainer makes
  Helper.useTickProvider(!loadingError || Helper.isValid(props.rates));
  // through refs, the tick effect needs a stable identity
  const fetchRates = React.useCallback(
    async ({ force = false } = {}) => {
      if (inFlightRef.current) {
        Helper.debug('🔒 Fetch already in flight');
        return;
      }
      const fetchedAt = Date.now();
      const interval =
        isOpenRef.current === false
          ? Settings.RATES_CLOSED_REFRESH_INTERVAL
          : Settings.RATES_REFRESH_INTERVAL;
      // negative elapsed would freeze polling, same as the ios widget
      const elapsed = fetchedAt - lastFetchAtRef.current;
      if (!force && elapsed >= 0 && elapsed < interval - SLACK) {
        Helper.debug('💤 Too soon since the last fetch');
        return;
      }
      if (!force && failedRef.current && !updatedAtRef.current) {
        Helper.debug('🛑 Waiting for the retry button');
        return;
      }
      const previousUpdatedAt = updatedAtRef.current;
      const initial = !previousUpdatedAt;
      const shouldShowToast =
        previousUpdatedAt &&
        timeInForeground.current &&
        fetchedAt - timeInForeground.current <=
          Settings.FOREGROUND_TOAST_WINDOW;
      Helper.debug('💫 Fetching rates', { initial });
      inFlightRef.current = true;
      lastFetchAtRef.current = fetchedAt;
      setLoadingError(false);
      try {
        const data = await Helper.getRates();
        if (initial) {
          await Helper.delay();
        }
        const updated_at = data?.updated_at;
        dispatch(actions.addRates(data));
        // not in the effect, a trigger between would repeat the side effects
        updatedAtRef.current = updated_at;
        failedRef.current = false;
        if (updated_at === previousUpdatedAt) {
          Helper.debug('✅ Rates already updated', updated_at);
          return;
        }
        Sentry.addBreadcrumb({
          message: 'Rates update event',
          data: updated_at,
        });
        Helper.debug(
          '⚡️ Rates updated',
          updated_at,
          previousUpdatedAt,
          shouldShowToast,
        );
        dispatch(actions.registerApplicationDownloadRates());
        WidgetKit.reloadAllTimelines();
        reloadWidgets();
        if (shouldShowToast) {
          if (Settings.NEW_HEADER_SCHEME) {
            Settings.HAPTICS_ENABLED && Haptics.notificationAsync();
          } else if (showUpdateToastRef.current !== false) {
            showActivityToast(I18n.t('rates_updated'), true);
          }
          timeInForeground.current = null;
        }
      } catch (error) {
        console.warn('Unable to get rates', error);
        failedRef.current = true;
        if (initial) {
          // same wait as the success path, a fast failure would flash the retry button back in
          await Helper.delay();
        }
        setLoadingError(true);
      } finally {
        inFlightRef.current = false;
      }
    },
    [dispatch, isOpenRef, showActivityToast, showUpdateToastRef],
  );
  React.useEffect(() => {
    const cleared = updatedAtRef.current && !updatedAt;
    // synced before the fetch, it marks an initial load
    updatedAtRef.current = updatedAt;
    if (cleared) {
      Helper.debug('💨 Store cleared');
      fetchRates({ force: true });
    }
  }, [updatedAt, fetchRates]);
  const isActiveAppState = useAppState('active');
  React.useEffect(() => {
    if (isActiveAppState) {
      // the mark the toast window is measured from, at the fetch start and not its answer
      timeInForeground.current = Date.now();
    }
  }, [isActiveAppState]);
  // the only periodic trigger, the in-flight guard drops its second mount call
  const now = Helper.useNow();
  React.useEffect(() => {
    fetchRates();
  }, [now, fetchRates]);
  const offlineRef = React.useRef(false);
  React.useEffect(() => {
    // isConnected is nullable, unknown must not count as offline
    return NetInfo.addEventListener(({ isConnected }) => {
      if (isConnected === false) {
        offlineRef.current = true;
      } else if (
        // netinfo repeats the event
        isConnected &&
        offlineRef.current &&
        failedRef.current &&
        !inFlightRef.current &&
        updatedAtRef.current
      ) {
        offlineRef.current = false;
        Helper.debug('📶 Network back');
        fetchRates({ force: true });
      }
    });
  }, [fetchRates]);
  return (
    <Component
      {...{
        ...props,
        loadingError,
        fetchRates,
      }}
    />
  );
};

export default withRateUpdates;
