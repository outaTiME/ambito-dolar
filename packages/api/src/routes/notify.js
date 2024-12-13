import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const {
    push_token,
    message,
    type,
    social = true,
  } = event.queryStringParameters || {};
  try {
    const message_id = await Shared.triggerNotifyEvent({
      push_token,
      message,
      type,
      social: Shared.isQueryParamTruthy(social),
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
