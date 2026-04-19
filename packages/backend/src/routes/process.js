import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const { notify, close, force } = event.queryStringParameters || {};
  try {
    const message_id = await Shared.triggerProcessEvent({
      notify: Shared.isQueryParamTruthy(notify),
      close: Shared.isQueryParamTruthy(close),
      force: Shared.isQueryParamTruthy(force),
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
