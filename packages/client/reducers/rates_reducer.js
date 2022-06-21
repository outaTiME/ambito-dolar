import * as _ from 'lodash';

import {
  ADD_RATES,
  UPDATE_HISTORICAL_RATES,
  PRUNE_RATES,
  PRUNE,
} from '../actions/types';

const INITIAL_STATE = {
  rates: null,
  updated_at: null,
  historical_rates: null,
};

export default (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case ADD_RATES: {
      const { rates, updated_at } = payload;
      // rates should update only on firebase changes
      if (!_.isEqual(state.rates, rates)) {
        return {
          ...state,
          rates,
          updated_at,
          // remove historical data to force refetch
          historical_rates: null,
        };
      }
      return state;
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
