import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import Helper from '../utilities/Helper';
import {
  NOTIFICATIONS_REGISTER_PENDING,
  NOTIFICATIONS_REGISTER_SUCCESS,
  NOTIFICATIONS_REGISTER_ERROR,
  APP_LOAD,
  APP_REVIEW,
  UPDATE_NOTIFICATION_SETTINGS,
  APP_UPDATE,
  APP_INVALID,
  APP_IGNORE_UPDATE,
  // APP_VALID,
  ADD_RATES,
  UPDATE_RATES_PROCESSED_AT,
  UPDATE_HISTORICAL_RATES,
  FORCE_APP_INVALID,
} from './types';

export const addRates = (payload) => ({
  type: ADD_RATES,
  payload,
});

export const updateRatesProcessedAt = (payload) => ({
  type: UPDATE_RATES_PROCESSED_AT,
  payload,
});

export const updateHistoricalRates = (payload) => ({
  type: UPDATE_HISTORICAL_RATES,
  payload,
});

const doRegisterDevice = async (dispatch, state, value = {}) => {
  const { installationId, manifest } = Constants;
  const { version: app_version, revisionId: app_revision_id } = manifest;
  const { OS: platform_os, Version: platform_version } = Platform;
  // send notification settings in each call to avoid error handling
  const {
    application: { notification_settings },
  } = state;
  const extra = {
    notification_settings,
    ...value,
  };
  const data = {
    installation_id: installationId,
    device_name: Constants.deviceName,
    app_version,
    app_revision_id,
    app_ownership: Constants.appOwnership,
    platform_os,
    platform_version,
    ...Helper.getPlatformModel(),
    ...extra,
  };
  if (__DEV__) {
    console.log('Registration or interaction on device');
  }
  return Helper.registerDevice(data).then(
    async ({ notificationSettings, statusCode }) => {
      if (notificationSettings) {
        if (__DEV__) {
          console.log(
            'Update notification settings from remote',
            notificationSettings
          );
        }
        // update notification settings from server
        // this will solve issue when lost data after update to v2
        await dispatch({
          type: UPDATE_NOTIFICATION_SETTINGS,
          payload: notificationSettings,
        });
      }
      if (statusCode === 'update_app') {
        return dispatch({
          type: APP_INVALID,
        });
      }
      return Promise.resolve();
      // TODO: clear invalid attributes when no statusCode?
      /* return dispatch({
      type: APP_VALID,
    }); */
    }
  );
};

const doRegisterDeviceForNotifications = (dispatch, current_state) =>
  Notifications.getExpoPushTokenAsync().then(({ data: push_token }) =>
    doRegisterDevice(dispatch, current_state, { push_token }).then(
      () => push_token
    )
  );

export const registerDeviceInteraction = () => async (dispatch, getState) => {
  const current_state = getState();
  return doRegisterDevice(dispatch, current_state).catch((error) => {
    if (__DEV__) {
      console.warn('Unable to register device interaction', error);
    }
  });
};

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
        })
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

export const registerApplicationLoad = () => ({
  type: APP_LOAD,
});

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

export const forceInvalidApplication = () => ({
  type: FORCE_APP_INVALID,
});
