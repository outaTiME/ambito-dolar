import _ from 'lodash';

import Shared from '../libs/shared.js';

export const handler = Shared.wrapHandler(async (event) => {
  try {
    const base_rates = JSON.parse(event.body || '{}');
    if (_.isEmpty(base_rates)) {
      throw new Error('No data available');
    }
    // save json files
    await Shared.storeHistoricalRatesJsonObject(base_rates);
    return Shared.serviceResponse(null, 200, {
      status: 'Historical rates updated',
    });
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
});
