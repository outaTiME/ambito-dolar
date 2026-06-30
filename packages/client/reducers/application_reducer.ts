import update from 'immutability-helper';
import * as _ from 'lodash';
import { nanoid } from 'nanoid/non-secure';

import {
  NOTIFICATIONS_REGISTER_PENDING,
  NOTIFICATIONS_REGISTER_SUCCESS,
  NOTIFICATIONS_REGISTER_ERROR,
  REGISTER_DEVICE_SYNCED,
  APP_REVIEW,
  UPDATE_NOTIFICATION_SETTINGS,
  APP_UPDATE,
  APP_USAGE_DAY,
  APP_USAGE,
  APP_CONVERSION,
  APP_DOWNLOAD_RATES,
  APP_DOWNLOAD_HISTORICAL_RATES,
  APP_DETAILED_RATES,
  CHANGE_APPEARANCE,
  CHANGE_RATE_ORDER,
  CHANGE_RATE_ORDER_DIRECTION,
  EXCLUDE_RATE,
  UPDATE_RATE_TYPES,
  RESTORE_CUSTOMIZATION,
  SHOW_UPDATE_TOAST,
  USE_RELATIVE_DATES,
  APP_IGNORE_DONATION,
  APP_REGISTER_DONATION,
  PRUNE,
} from '@/actions/types';
import DateUtils from '@/utilities/Date';

const INITIAL_STATE = {
  push_token: null,
  sending_push_token: false,
  // days_used_for_review: 0,
  last_review: null,
  last_version_reviewed: null,
  notification_settings: null,
  last_register_hash: null,
  // statistics
  last_day_used: null,
  usages: 0,
  days_used: 0,
  conversions: 0,
  downloaded_rates: 0,
  downloaded_historical_rates: 0,
  detailed_rates: 0,
  appearance: null,
  rate_order: null,
  rate_order_direction: null,
  excluded_rates: null,
  rate_types: null,
  show_update_toast: true,
  use_relative_dates: true,
  // version check
  version: null,
  app_updated: null,
  ignore_donation_days_used: 0,
  ignore_donation_count: 0,
  // identifier to handle errors and support
  installation_id: nanoid(),
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
    case REGISTER_DEVICE_SYNCED:
      return update(state, {
        last_register_hash: { $set: action.payload },
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
        app_updated: { $set: Date.now() },
      });
    case APP_USAGE_DAY: {
      const current_date = DateUtils.get();
      if (
        state.last_day_used &&
        current_date.isSame(state.last_day_used, 'day')
      ) {
        return state;
      }
      return increment(state, 'days_used', {
        last_day_used: { $set: current_date.format() },
      });
    }
    case APP_USAGE:
      return increment(state, 'usages');
    case APP_CONVERSION:
      return increment(state, 'conversions');
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
      // value true keeps the rate visible, false excludes it
      const { type, value } = action.payload;
      if (value === true) {
        return update(state, {
          excluded_rates: { $set: _.without(state.excluded_rates, type) },
        });
      }
      return update(state, {
        excluded_rates: { $set: [type].concat(state.excluded_rates ?? []) },
      });
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
    case SHOW_UPDATE_TOAST:
      return update(state, {
        show_update_toast: { $set: action.payload },
      });
    case USE_RELATIVE_DATES:
      return update(state, {
        use_relative_dates: { $set: action.payload },
      });
    case APP_IGNORE_DONATION:
      return update(state, {
        ignore_donation_days_used: { $set: state.days_used ?? 0 },
        ignore_donation_count: { $set: (state.ignore_donation_count ?? 0) + 1 },
      });
    case APP_REGISTER_DONATION:
      return update(state, {
        ignore_donation_days_used: { $set: 0 },
        ignore_donation_count: { $set: 0 },
      });
    case PRUNE:
      return update(INITIAL_STATE, {
        // preserve
        installation_id: { $set: state.installation_id },
      });

    default:
      return state;
  }
};
