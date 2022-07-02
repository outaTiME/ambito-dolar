import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async () => {
  const message_id = await Shared.triggerInvalidateReceiptsEvent({
    // pass
  });
  return {
    message_id,
  };
});
