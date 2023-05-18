import { login } from 'masto';

// https://github.com/neet/masto.js/blob/main/examples/create-new-status-with-image.ts
export const publish = async (caption, file) => {
  try {
    const start_time = Date.now();
    const masto = await login({
      url: process.env.MASTODON_URL,
      accessToken: process.env.MASTODON_ACCESS_TOKEN,
      ...(process.env.SST_STAGE !== 'prod' && {
        logLevel: 'debug',
      }),
    });
    const attachment =
      file &&
      (await masto.v2.mediaAttachments.create({
        // native support of `fetch` on node 18
        // file: new Blob([file]),
        file,
      }));
    const { id: status_id } = await masto.v1.statuses.create({
      status: caption,
      visibility: process.env.SST_STAGE === 'prod' ? 'public' : 'private',
      ...(attachment && {
        mediaIds: [attachment.id],
      }),
    });
    const duration = (Date.now() - start_time) / 1000;
    return {
      status_id,
      ...(attachment && {
        media_id: attachment.id,
      }),
      duration,
    };
  } catch (error) {
    /* console.error(
      'Unable to publish to mastodon',
      JSON.stringify({ error: error.message })
    ); */
    // unhandled error
    throw error;
  }
};
