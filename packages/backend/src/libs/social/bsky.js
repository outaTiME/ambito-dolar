import { AtpAgent, RichText } from '@atproto/api';

export const publish = async (caption, file) => {
  const agent = new AtpAgent({ service: 'https://bsky.social' });
  await agent.login({
    identifier: process.env.BSKY_USERNAME,
    password: process.env.BSKY_PASSWORD,
  });
  const attachment =
    file &&
    (await agent.uploadBlob(file, {
      encoding: 'image/jpeg',
    }));
  const richText = new RichText({ text: caption });
  // automatically detects mentions and links
  await richText.detectFacets(agent);
  const postRecord = {
    $type: 'app.bsky.feed.post',
    text: richText.text,
    facets: richText.facets,
    createdAt: new Date().toISOString(),
    ...(attachment && {
      embed: {
        $type: 'app.bsky.embed.images',
        images: [
          {
            image: attachment.data.blob,
            alt: '',
          },
        ],
      },
    }),
  };
  const result = await agent.post(postRecord);
  return {
    ...result,
  };
};
