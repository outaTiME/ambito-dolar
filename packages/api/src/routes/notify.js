import Shared from '../libs/shared';

export async function handler(event) {
  const { type, installation_id, message } = event.queryStringParameters || {};
  try {
    const message_id = await Shared.triggerNotifyEvent({
      type,
      installation_id,
      message,
    });
    return Shared.serviceResponse(null, 200, {
      message_id,
    });
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
}
