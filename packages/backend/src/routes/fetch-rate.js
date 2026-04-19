import AmbitoDolar from '@ambito-dolar/core';
import prettyMilliseconds from 'pretty-ms';

import Shared, { USER_AGENT } from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const type = event?.queryStringParameters?.type || AmbitoDolar.INFORMAL_TYPE;
  const start_time = Date.now();
  const url = Shared.getRateUrl(type);
  return AmbitoDolar.fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
    },
  })
    .then(async (response) => {
      const data = await response.json();
      const duration = prettyMilliseconds(Date.now() - start_time);
      console.info(
        'Rate fetch completed',
        JSON.stringify({
          type,
          duration,
        }),
      );
      return Shared.serviceResponse(null, 200, data);
    })
    .catch((error) => {
      return Shared.serviceResponse(null, error.code || 400, {
        error: error.message,
      });
    });
});
