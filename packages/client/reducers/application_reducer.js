import update from 'immutability-helper';
import * as _ from 'lodash';

import {
  NOTIFICATIONS_REGISTER_PENDING,
  NOTIFICATIONS_REGISTER_SUCCESS,
  NOTIFICATIONS_REGISTER_ERROR,
  APP_REVIEW,
  UPDATE_NOTIFICATION_SETTINGS,
  PRUNE,
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
  APP_USAGE,
} from '../actions/types';
import DateUtils from '../utilities/Date';

const INITIAL_STATE = {
  push_token: null,
  sending_push_token: false,
  // days_used_for_review: 0,
  last_review: null,
  last_version_reviewed: null,
  notification_settings: null,
  // statistics
  last_day_used: null,
  usages: 0,
  days_used: 0,
  conversions: 0,
  shared_rates: 0,
  downloaded_rates: 0,
  downloaded_historical_rates: 0,
  detailed_rates: 0,
  appearance: null,
  rate_order: null,
  rate_order_direction: null,
  excluded_rates: null,
  rate_types: null,
  // version check
  version: null,
  invalid_version: false,
  ignore_update: null,
  app_updated: null,
};

const increment = (state, key, extra = {}) =>
  update(state, {
    [key]: {
      $set: (state[key] ?? 0) + 1,
    },
    ...extra,
  });

export default (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case NOTIFICATIONS_REGISTER_PENDING:
      return update(state, {
        push_token: { $set: null },
        sending_push_token: { $set: true },
      });
    case NOTIFICATIONS_REGISTER_SUCCESS:
      return update(state, {
        push_token: { $set: action.payload },
        sending_push_token: { $set: false },
      });
    case NOTIFICATIONS_REGISTER_ERROR:
      return update(state, {
        sending_push_token: { $set: false },
      });
    case APP_REVIEW:
      return update(state, {
        last_review: { $set: Date.now() },
        last_version_reviewed: { $set: action.payload },
      });
    case UPDATE_NOTIFICATION_SETTINGS:
      return update(state, {
        notification_settings: { $set: action.payload },
      });
    case APP_UPDATE:
      return update(state, {
        version: { $set: action.payload },
        invalid_version: { $set: false },
        ignore_update: { $set: null },
        // days_used_for_review: { $set: 0 },
        app_updated: { $set: Date.now() },
      });
    case APP_IGNORE_UPDATE:
      return update(state, {
        ignore_update: { $set: Date.now() },
      });
    case APP_INVALID_VERSION:
      return update(state, {
        invalid_version: { $set: true },
      });
    case FORCE_APP_INVALID_VERSION:
      return update(state, {
        invalid_version: { $set: true },
        ignore_update: { $set: null },
      });
    case APP_USAGE_DAY: {
      const current_date = DateUtils.get();
      if (
        !state.last_day_used ||
        !current_date.isSame(state.last_day_used, 'day')
      ) {
        return increment(state, 'days_used', {
          last_day_used: { $set: current_date.format() },
        });
      }
      return state;
    }
    case APP_USAGE:
      return increment(state, 'usages');
    case APP_CONVERSION:
      return increment(state, 'conversions');
    case APP_SHARE_RATES:
      return increment(state, 'shared_rates');
    case APP_DOWNLOAD_RATES:
      return increment(state, 'downloaded_rates');
    case APP_DOWNLOAD_HISTORICAL_RATES:
      return increment(state, 'downloaded_historical_rates');
    case APP_DETAILED_RATES:
      return increment(state, 'detailed_rates');
    case CHANGE_APPEARANCE:
      return update(state, {
        appearance: { $set: action.payload },
      });
    case CHANGE_RATE_ORDER:
      return update(state, {
        rate_order: { $set: action.payload },
      });
    case CHANGE_RATE_ORDER_DIRECTION:
      return update(state, {
        rate_order_direction: { $set: action.payload },
      });
    case EXCLUDE_RATE: {
      const { type, value } = action.payload;
      if (value === true) {
        return {
          ...state,
          excluded_rates: _.without(state.excluded_rates, type),
        };
      }
      return {
        ...state,
        excluded_rates: [type].concat(state.excluded_rates || []),
      };
    }
    case UPDATE_RATE_TYPES:
      return update(state, {
        rate_types: { $set: action.payload },
      });
    case RESTORE_CUSTOMIZATION:
      return update(state, {
        rate_order: { $set: null },
        rate_order_direction: { $set: null },
        excluded_rates: { $set: null },
        rate_types: { $set: null },
      });
    case PRUNE:
      return INITIAL_STATE;
    default:
      return state;
  }
};
