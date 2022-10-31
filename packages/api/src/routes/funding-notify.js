import { boolean } from 'boolean';

import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const { ig_only, generate_only } = event.queryStringParameters || {};

  try {
    const message_id = await Shared.triggerFundingNotifyEvent({
      ig_only: boolean(ig_only),
      generate_only: boolean(generate_only),
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
