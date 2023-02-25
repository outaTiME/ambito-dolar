import generator from 'megalodon';

// https://github.com/h3poteto/megalodon/blob/master/example/typescript/src/mastodon/toot.ts
export const publish = async (caption, file) => {
  try {
    const start_time = Date.now();
    const client = generator(
      'mastodon',
      process.env.MASTODON_URL,
      process.env.MASTODON_ACCESS_TOKEN
    );
    let attachment;
    if (file) {
      attachment = await client.uploadMedia(file);
    }
    console.log('>>> attachment', JSON.stringify(attachment));
    const status = await client.postStatus(caption, {
      // visibility: 'public',
      visibility: 'private',
      ...(attachment && {
        media_ids: [attachment.id],
      }),
    });
    const duration = (Date.now() - start_time) / 1000;
    return {
      status,
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
