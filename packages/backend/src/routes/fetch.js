import * as _ from 'lodash';

import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async () => {
  try {
    const results = await Shared.getRates().then((data) => {
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
