import _ from 'lodash';

import {
  ADD_RATES,
  UPDATE_RATES_PROCESSED_AT,
  UPDATE_HISTORICAL_RATES,
  PRUNE,
} from '../actions/types';

const INITIAL_STATE = {
  rates: null,
  processed_at: null,
  historical_rates: null,
};

export default (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case ADD_RATES: {
      const { rates } = payload;
      // prevent when not updates on boot
      if (!_.isEqual(state.rates, rates)) {
        return {
          ...state,
          rates,
          // clean historical data
          historical_rates: null,
        };
      }
      return state;
    }
    case UPDATE_RATES_PROCESSED_AT:
      return {
        ...state,
        processed_at: payload || Date.now(),
      };
    case UPDATE_HISTORICAL_RATES:
      return {
        ...state,
        historical_rates: payload,
      };
    case PRUNE:
      return INITIAL_STATE;
    default:
      return state;
  }
};
