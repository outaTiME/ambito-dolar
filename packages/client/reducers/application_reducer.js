import update from 'immutability-helper';

import {
  NOTIFICATIONS_REGISTER_PENDING,
  NOTIFICATIONS_REGISTER_SUCCESS,
  NOTIFICATIONS_REGISTER_ERROR,
  APP_LOAD,
  APP_REVIEW,
  UPDATE_NOTIFICATION_SETTINGS,
  PRUNE,
  APP_UPDATE,
  APP_IGNORE_UPDATE,
  APP_INVALID_VERSION,
  APP_VALID_VERSION,
  FORCE_APP_INVALID_VERSION,
  APP_USAGE_DAY,
  APP_CONVERSION,
  CHANGE_APPEARANCE,
} from '../actions/types';
import DateUtils from '../utilities/Date';

const INITIAL_STATE = {
  push_token: null,
  sending_push_token: false,
  loads: 0,
  last_version_reviewed: null,
  notification_settings: null,
  last_day_used: null,
  days_used: 0,
  conversions: 0,
  appearance: null,
  // version check
  version: null,
  invalid_version: false,
  ignore_update: null,
};

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
    case APP_LOAD:
      return update(state, {
        loads: { $set: state.loads + 1 },
      });
    case APP_REVIEW:
      return update(state, {
        loads: { $set: 0 },
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
      });
    case APP_IGNORE_UPDATE:
      return update(state, {
        ignore_update: { $set: Date.now() },
      });
    case APP_INVALID_VERSION:
      return update(state, {
        invalid_version: { $set: true },
      });
    // same as APP_UPDATE but leave app version
    case APP_VALID_VERSION:
      return update(state, {
        invalid_version: { $set: false },
        ignore_update: { $set: null },
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
        const new_state = update(state, {
          last_day_used: { $set: current_date.format() },
          days_used: { $set: (state.days_used ?? 0) + 1 },
        });
        return new_state;
      }
      return state;
    }
    case APP_CONVERSION:
      return update(state, {
        conversions: { $set: (state.conversions ?? 0) + 1 },
      });
    case CHANGE_APPEARANCE:
      return update(state, {
        appearance: { $set: action.payload },
      });
    case PRUNE:
      return INITIAL_STATE;
    default:
      return state;
  }
};
