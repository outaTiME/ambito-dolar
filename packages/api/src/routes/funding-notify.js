import { boolean } from 'boolean';

import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const { generate_only, targets, earlier } = event.queryStringParameters || {};
  try {
    const message_id = await Shared.triggerFundingNotifyEvent({
      generate_only: boolean(generate_only),
      earlier: boolean(earlier),
      ...(targets && { targets: targets.split(',') }),
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
