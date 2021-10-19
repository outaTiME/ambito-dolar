import _ from 'lodash';

import {
  ADD_RATES,
  UPDATE_HISTORICAL_RATES,
  PRUNE_RATES,
  PRUNE,
} from '../actions/types';

const INITIAL_STATE = {
  rates: null,
  processed_at: null,
  updated_at: null,
  historical_rates: null,
};

export default (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case ADD_RATES: {
      const { rates, processed_at } = payload;
      // prevent multiple updates
      if (!_.isEqual(state.rates, rates)) {
        return {
          ...state,
          rates,
          processed_at,
          updated_at: Date.now(),
          // remove historical data to force refresh
          historical_rates: null,
        };
      }
      return {
        ...state,
        processed_at,
        updated_at: Date.now(),
      };
    }
    case UPDATE_HISTORICAL_RATES:
      return {
        ...state,
        historical_rates: payload,
      };
    case PRUNE_RATES:
    case PRUNE:
      return INITIAL_STATE;
    default:
      return state;
  }
};
