import Shared from '../libs/shared';

export async function handler() {
  const message_id = await Shared.triggerInvalidateReceiptsEvent({
    // pass
  });
  return {
    message_id,
  };
}
