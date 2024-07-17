import { createRestAPIClient } from 'masto';
import { Blob } from 'node:buffer';

// https://github.com/neet/masto.js/blob/main/examples/create-new-status-with-image.ts
export const publish = async (caption, file) => {
  try {
    // const start_time = Date.now();
    const masto = await createRestAPIClient({
      url: process.env.MASTODON_URL,
      accessToken: process.env.MASTODON_ACCESS_TOKEN,
      ...(process.env.SST_STAGE !== 'prod' && {
        logLevel: 'debug',
      }),
    });
    const attachment =
      file &&
      (await masto.v2.media.create({
        file: new Blob([file]),
        // file: await fetch(image_url).then((res) => res.blob()),
      }));
    const { id: status_id } = await masto.v1.statuses.create({
      status: caption,
      visibility: process.env.SST_STAGE === 'prod' ? 'public' : 'private',
      ...(attachment && {
        mediaIds: [attachment.id],
      }),
    });
    return {
      status_id,
      ...(attachment && {
        media_id: attachment.id,
      }),
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
