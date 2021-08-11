import _ from 'lodash';

import { ADD_RATES, UPDATE_HISTORICAL_RATES, PRUNE } from '../actions/types';

const INITIAL_STATE = {
  rates: null,
  processed_at: null,
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
          // remove historical data to force refresh
          historical_rates: null,
        };
      }
      return {
        ...state,
        processed_at,
      };
    }
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
