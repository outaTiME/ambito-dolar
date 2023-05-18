import { boolean } from 'boolean';

import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const {
    installation_id,
    message,
    type,
    social = true,
  } = event.queryStringParameters || {};
  try {
    const message_id = await Shared.triggerNotifyEvent({
      installation_id,
      message,
      type,
      social: boolean(social),
    });
    return Shared.serviceResponse(null, 200, {
      message_id,
    });
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
});
