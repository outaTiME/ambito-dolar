import AmbitoDolar from '@ambito-dolar/core';
import * as _ from 'lodash';

import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  try {
    const base_rates = JSON.parse(event.body || '{}');
    if (_.isEmpty(base_rates.rates)) {
      throw new Error('No data available');
    }
    const processed_at = AmbitoDolar.getTimezoneDate();
    const processed_at_fmt = processed_at.format();
    const processed_at_unix = processed_at.unix();
    // add / override updated_at field
    base_rates.updated_at = processed_at_fmt;
    // TODO: review the update of processed_at field (should be updated only by processor)
    // add / override processed_at field
    // base_rates.processed_at = processed_at_fmt;
    // save json files
    await Shared.storeRatesJsonObject(base_rates, true);
    // firebase update should occur after saving json files
    await Shared.updateFirebaseData('', {
      updated_at: processed_at_fmt,
      u: processed_at_unix,
    });
    return Shared.serviceResponse(null, 200, { status: 'Rates updated' });
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
});
