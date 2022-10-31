import * as _ from 'lodash';

import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async () => {
  try {
    const credentials = Buffer.from(
      [process.env.AMPLITUDE_API_KEY, process.env.AMPLITUDE_SECRET_KEY].join(
        ':'
      )
    ).toString('base64');
    const results = await Shared.fetch(process.env.AMPLITUDE_USAGE_STATS_URL, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    }).then(async (response) => {
      const { data } = await response.json();
      const [users, events, conversions] = _.chunk(data?.values?.[0], 3);
      const stats = {
        users,
        events,
        conversions,
      };
      if (!_.isEmpty(stats)) {
        return stats;
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
