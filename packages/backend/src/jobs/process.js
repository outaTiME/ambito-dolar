import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async () => {
  const message_id = await Shared.triggerProcessEvent({
    notify: true,
  });
  return {
    message_id,
  };
});
