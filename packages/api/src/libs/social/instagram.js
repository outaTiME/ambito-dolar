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

const fetchPermalink = (media_id) =>
  req(`/${media_id}`, { searchParams: { fields: 'permalink' } })
    .then(({ permalink }) => permalink)
    .catch(() => {
      console.warn('Unable to fetch permalink');
    });

export const publish = async (url, caption, storyUrl) => {
  const tasks = [
    createAndPublish({ image_url: url, ...(caption && { caption }) }).then(
      (media_id) =>
        fetchPermalink(media_id).then((permalink) => ({ media_id, permalink })),
    ),
  ];
  if (storyUrl) {
    tasks.push(
      createAndPublish({ media_type: 'STORIES', image_url: storyUrl })
        .then((media_id) => ({ media_id }))
        .catch(() => {
          console.warn('Story publish failed');
        }),
    );
  }
  const [feed, story] = await Promise.all(tasks);
  return { feed, story };
};
