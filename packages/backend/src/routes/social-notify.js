import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const { type, title, caption, generate_only, targets } =
    event.queryStringParameters || {};
  try {
    const message_id = await Shared.triggerSocialNotifyEvent({
      type,
      title,
      caption,
      generate_only: Shared.isQueryParamTruthy(generate_only),
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
