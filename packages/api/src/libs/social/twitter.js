import { TwitterApi, EUploadMimeType } from 'twitter-api-v2';

export const publish = async (caption, file) => {
  try {
    // const start_time = Date.now();
    const client = new TwitterApi({
      appKey: process.env.TWITTER_APP_KEY,
      appSecret: process.env.TWITTER_APP_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
    const media_id =
      file &&
      (await client.v1.uploadMedia(file, {
        mimeType: EUploadMimeType.Jpeg,
      }));
    /* const {
      data: { id },
    } = await client.v2.tweet(caption, {
      ...(media_id && {
        media: {
          media_ids: [media_id],
        },
      }),
    }); */
    const { id } = await client.v1.tweet(caption, {
      ...(media_id && {
        media: {
          media_ids: [media_id],
        },
      }),
    });
    // const duration = Date.now() - start_time;
    return {
      id,
      ...(media_id && {
        media_id,
      }),
      // duration: prettyMilliseconds(duration),
    };
  } catch (error) {
    /* console.error(
      'Unable to publish to twitter',
      JSON.stringify({ error: error.message })
    ); */
    // unhandled error
    throw error;
  }
};
