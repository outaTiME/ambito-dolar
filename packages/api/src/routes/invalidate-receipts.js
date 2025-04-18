import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const { date_from, readonly } = event.queryStringParameters || {};
  try {
    const message_id = await Shared.triggerInvalidateReceiptsEvent({
      date_from,
      readonly: Shared.isQueryParamTruthy(readonly),
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
