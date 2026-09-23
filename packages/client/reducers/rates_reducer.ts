import * as _ from 'lodash';

import {
  ADD_RATES,
  UPDATE_HISTORICAL_RATES,
  PRUNE_RATES,
  PRUNE,
} from '@/actions/types';

const INITIAL_STATE = {
  rates: null,
  updated_at: null,
  is_open: null,
  historical_rates: null,
};

export default (state = INITIAL_STATE, { type, payload }) => {
  switch (type) {
    case ADD_RATES: {
      const { rates, updated_at, is_open } = payload;
      const same_rates = _.isEqual(state.rates, rates);
      // the flag moves on its own, with no change on the rates
      if (
        same_rates &&
        state.updated_at === updated_at &&
        state.is_open === is_open
      ) {
        return state;
      }
      // same identity so the rows do not re-render
      return {
        ...state,
        rates: same_rates ? state.rates : rates,
        updated_at,
        is_open,
        // the cached historical ends on the old stat, drop it so the next range refetches
        historical_rates: same_rates ? state.historical_rates : null,
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
