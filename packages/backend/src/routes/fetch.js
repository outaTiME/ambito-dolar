import _ from 'lodash';

import Shared from '../libs/shared.js';

export const handler = Shared.wrapHandler(async () => {
  try {
    // the same body cloudfront serves from s3 in production
    const results = await Shared.readRatesJsonObject().then((quotes) => {
      const data = Shared.getFetchStats(quotes);
      if (!_.isEmpty(data)) {
        return data;
      }
      throw new Error('No data available');
    });
    return Shared.serviceResponse(null, 200, results);
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
});
