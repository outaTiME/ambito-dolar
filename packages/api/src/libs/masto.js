import { login } from 'masto';
// import sleep from 'sleep-promise';

// https://github.com/neet/masto.js/blob/main/examples/create-new-status-with-image.ts
export const publish = async (caption, file) => {
  try {
    const start_time = Date.now();
    const masto = await login({
      url: process.env.MASTODON_URL,
      accessToken: process.env.MASTODON_ACCESS_TOKEN,
      logLevel: 'debug',
    });
    const attachment =
      file &&
      (await masto.v2.mediaAttachments.create({
        file,
      }));
    console.log('>>> attachment', JSON.stringify(attachment));
    // https://github.com/neet/masto.js/issues/823#issuecomment-1396347864
    // await sleep(5 * 1000);
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
    console.error(
      'Unable to publish to mastodon',
      JSON.stringify({ error: error.message })
    );
    // unhandled error
    throw error;
  }
};
