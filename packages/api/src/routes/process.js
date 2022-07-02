import { boolean } from 'boolean';

import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const { notify, close } = event.queryStringParameters || {};
  try {
    const message_id = await Shared.triggerProcessEvent({
      notify: boolean(notify),
      close: boolean(close),
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
