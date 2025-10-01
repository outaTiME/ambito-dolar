import AmbitoDolar from '@ambito-dolar/core';

const IG_PAGE_TOKEN = process.env.IG_PAGE_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;

const req = (path, { searchParams = {}, ...opts } = {}) =>
  AmbitoDolar.fetch(`https://graph.facebook.com/v23.0${path}`, {
    ...opts,
    searchParams: { access_token: IG_PAGE_TOKEN, ...searchParams },
  }).json();

const createAndPublish = (searchParams) =>
  req(`/${IG_USER_ID}/media`, { method: 'POST', searchParams })
    .then(({ id }) =>
      req(`/${IG_USER_ID}/media_publish`, {
        method: 'POST',
        searchParams: { creation_id: id },
      }),
    )
    .then(({ id: media_id }) => media_id);

// eslint-disable-next-line no-unused-vars
const fetchPermalink = (media_id) =>
  req(`/${media_id}`, { searchParams: { fields: 'permalink' } })
    .then(({ permalink }) => permalink)
    .catch(() => {
      console.warn('Unable to fetch permalink');
    });

export const publish = async (url, caption, storyUrl) => {
  const feedId = await createAndPublish({
    image_url: url,
    ...(caption && { caption }),
  });
  // const permalink = await fetchPermalink(feedId);
  let story;
  if (storyUrl) {
    try {
      const storyId = await createAndPublish({
        media_type: 'STORIES',
        image_url: storyUrl,
      });
      story = { media_id: storyId };
    } catch (error) {
      console.warn(
        'Story publish failed',
        JSON.stringify({ error: error.message }),
      );
    }
  }
  return {
    feed: {
      media_id: feedId,
      // permalink
    },
    story,
  };
};
