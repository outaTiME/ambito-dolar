import prettyMilliseconds from 'pretty-ms';

import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async () => {
  try {
    const start_time = Date.now();
    const active_devices = await Shared.getActiveDevices();
    const duration = prettyMilliseconds(Date.now() - start_time);
    return Shared.serviceResponse(null, 200, {
      amount: active_devices.length,
      duration,
    });
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
});
