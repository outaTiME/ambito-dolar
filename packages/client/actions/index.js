import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import {
  NOTIFICATIONS_REGISTER_PENDING,
  NOTIFICATIONS_REGISTER_SUCCESS,
  NOTIFICATIONS_REGISTER_ERROR,
  APP_REVIEW,
  UPDATE_NOTIFICATION_SETTINGS,
  APP_UPDATE,
  APP_IGNORE_UPDATE,
  APP_INVALID_VERSION,
  FORCE_APP_INVALID_VERSION,
  APP_USAGE_DAY,
  APP_CONVERSION,
  APP_SHARE_RATES,
  APP_DOWNLOAD_RATES,
  APP_DOWNLOAD_HISTORICAL_RATES,
  APP_DETAILED_RATES,
  CHANGE_APPEARANCE,
  CHANGE_RATE_ORDER,
  CHANGE_RATE_ORDER_DIRECTION,
  EXCLUDE_RATE,
  UPDATE_RATE_TYPES,
  RESTORE_CUSTOMIZATION,
  ADD_RATES,
  UPDATE_HISTORICAL_RATES,
  PRUNE_RATES,
  PRUNE,
  APP_USAGE,
  APP_IGNORE_DONATION,
} from './types';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export const addRates = (payload) => ({
  type: ADD_RATES,
  payload,
});

export const updateHistoricalRates = (payload) => ({
  type: UPDATE_HISTORICAL_RATES,
  payload,
});

const doRegisterDevice = (dispatch, state, value = {}) => {
  // send notification settings in each call to avoid error handling
  const {
    application: { notification_settings, push_token },
  } = state;
  const data = {
    push_token: value?.push_token ?? push_token,
    app_version: Settings.APP_VERSION,
    notification_settings,
  };
  Helper.debug('Registration or interaction on device', data);
  return Helper.registerDevice(data).then(
    async ({ notificationSettings, statusCode }) => {
      if (notificationSettings) {
        Helper.debug(
          'Update notification settings from remote',
          notificationSettings,
        );
        // update notification settings from server
        await dispatch({
          type: UPDATE_NOTIFICATION_SETTINGS,
          payload: notificationSettings,
        });
      }
      if (statusCode === 'update_app') {
        return dispatch({
          type: APP_INVALID_VERSION,
        });
      }
      return Promise.resolve();
    },
  );
};

const doRegisterDeviceForNotifications = (dispatch, current_state) =>
  Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig.extra.eas.projectId,
  }).then(({ data: push_token }) =>
    doRegisterDevice(dispatch, current_state, { push_token }).then(
      () => push_token,
    ),
  );

export const registerDeviceForNotifications =
  () => async (dispatch, getState) => {
    await dispatch({
      type: NOTIFICATIONS_REGISTER_PENDING,
    });
    const current_state = getState();
    return doRegisterDeviceForNotifications(dispatch, current_state)
      .then((push_token) =>
        dispatch({
          type: NOTIFICATIONS_REGISTER_SUCCESS,
          payload: push_token,
        }),
      )
      .catch((error) => {
        if (__DEV__) {
          console.warn('Unable to register device for notifications', error);
        }
        return dispatch({
          type: NOTIFICATIONS_REGISTER_ERROR,
        });
      });
  };

export const registerApplicationReview = (payload) => ({
  type: APP_REVIEW,
  payload,
});

export const updateNotificationSettings =
  (settings) => async (dispatch, getState) => {
    await dispatch({
      type: UPDATE_NOTIFICATION_SETTINGS,
      payload: settings,
    });
    // get state after settings update
    const current_state = getState();
    return doRegisterDevice(dispatch, current_state).catch((error) => {
      if (__DEV__) {
        console.warn('Unable to update notification settings', settings, error);
      }
    });
  };

export const registerApplicationUpdate = (payload) => ({
  type: APP_UPDATE,
  payload,
});

export const ignoreApplicationUpdate = () => ({
  type: APP_IGNORE_UPDATE,
});

export const forceApplicationInvalidVersion = () => ({
  type: FORCE_APP_INVALID_VERSION,
});

export const registerApplicationUsage = () => ({
  type: APP_USAGE,
});

export const registerApplicationUsageDay = () => ({
  type: APP_USAGE_DAY,
});

export const registerApplicationConversion = () => ({
  type: APP_CONVERSION,
});

export const registerApplicationShareRates = () => ({
  type: APP_SHARE_RATES,
});

export const registerApplicationDownloadRates = () => ({
  type: APP_DOWNLOAD_RATES,
});

export const registerApplicationDownloadHistoricalRates = () => ({
  type: APP_DOWNLOAD_HISTORICAL_RATES,
});

export const registerApplicationRateDetail = () => ({
  type: APP_DETAILED_RATES,
});

export const changeAppearance = (payload) => ({
  type: CHANGE_APPEARANCE,
  payload,
});

export const changeRateOrder = (payload) => ({
  type: CHANGE_RATE_ORDER,
  payload,
});

export const changeRateOrderDirection = (payload) => ({
  type: CHANGE_RATE_ORDER_DIRECTION,
  payload,
});

export const excludeRate = (type, value) => ({
  type: EXCLUDE_RATE,
  payload: {
    type,
    value,
  },
});

export const updateRateTypes = (payload) => ({
  type: UPDATE_RATE_TYPES,
  payload,
});

export const restoreCustomization = () => ({
  type: RESTORE_CUSTOMIZATION,
});

export const ignoreApplicationDonation = () => ({
  type: APP_IGNORE_DONATION,
});

export const clearRates = () => ({
  type: PRUNE_RATES,
});

export const clearStore = () => ({
  type: PRUNE,
});
