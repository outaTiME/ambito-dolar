import Shared from '../libs/shared';

export async function handler() {
  const message_id = await Shared.triggerProcessEvent({
    notify: true,
  });
  return {
    message_id,
  };
}
