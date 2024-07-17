import Reddit from 'reddit';

export const publish = async (caption, image_url) => {
  try {
    // const start_time = Date.now();
    const reddit = new Reddit({
      username: process.env.REDDIT_USERNAME,
      password: process.env.REDDIT_PASSWORD,
      appId: process.env.REDDIT_APP_ID,
      appSecret: process.env.REDDIT_APP_SECRET,
    });
    const {
      json: {
        data: { id, url },
      },
    } = await reddit.post('/api/submit', {
      sr: process.env.REDDIT_USERNAME,
      title: caption,
      kind: 'self',
      ...(image_url && {
        kind: 'link',
        url: image_url,
      }),
    });
    return {
      id,
      url,
    };
  } catch (error) {
    /* console.error(
      'Unable to publish to reddit',
      JSON.stringify({ error: error.message })
    ); */
    // unhandled error
    throw error;
  }
};
