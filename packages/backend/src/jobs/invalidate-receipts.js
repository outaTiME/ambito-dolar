import Shared from '../libs/shared.js';

export const handler = Shared.wrapHandler(async () => {
  const message_id = await Shared.triggerInvalidateReceiptsEvent({
    // pass
  });
  return {
    message_id,
  };
});
