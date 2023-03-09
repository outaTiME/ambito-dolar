import { IgApiClient } from 'instagram-private-api';

import Shared from '../shared';

// https://github.com/dilame/instagram-private-api/blob/3e1605831996c19e59f7b91461eea3539cd3521f/examples/story-upload.example.ts#L89
const centeredSticker = (width, height) => ({
  x: 0.5,
  y: 0.5,
  width,
  height,
  rotation: 0.0,
});

const loadSession = async (ig, serialized_session) => {
  if (serialized_session) {
    try {
      await ig.state.deserialize(serialized_session);
      // try any request to check if the session is still valid
      return await ig.account.currentUser();
    } catch {
      return false;
    }
  }
  return false;
};

// https://github.com/dilame/instagram-private-api/blob/master/examples/session.example.ts
export const publish = async (file, caption, story_file) => {
  try {
    const IG_SESSION_KEY = 'instagram-session';
    const IG_USERNAME = process.env.IG_USERNAME;
    const IG_PASSWORD = process.env.IG_PASSWORD;
    const start_time = Date.now();
    const ig = new IgApiClient();
    ig.state.generateDevice(IG_USERNAME);
    const serialized_session = await Shared.getJsonObject(IG_SESSION_KEY).catch(
      (error) => {
        console.warn(
          'Unable to get instagram session from bucket',
          JSON.stringify({ error: error.message })
        );
        // ignore
      }
    );
    const current_session = await loadSession(ig, serialized_session);
    if (!current_session) {
      ig.request.end$.subscribe(async () => {
        const serialized = await ig.state.serialize();
        // this deletes the version info, so you'll always use the version provided by the library
        delete serialized.constants;
        await Shared.storeJsonObject(IG_SESSION_KEY, serialized);
      });
      await ig.account.login(IG_USERNAME, IG_PASSWORD);
      console.info('Session created');
    } else {
      console.info('Session restored');
    }
    const {
      status,
      upload_id,
      media: { pk: media_id } = {},
    } = await ig.publish.photo({
      file,
      caption,
    });
    if (media_id && story_file) {
      await ig.publish.story({
        file: story_file,
        media: {
          ...centeredSticker(0.8, 0.8),
          is_sticker: true,
          media_id,
        },
        // link: 'https://cafecito.app/ambitodolar',
      });
    }
    const duration = (Date.now() - start_time) / 1000;
    return {
      status,
      upload_id,
      media_id,
      duration,
    };
  } catch (error) {
    console.error(
      'Unable to publish to instagram',
      JSON.stringify({ error: error.message })
    );
    // unhandled error
    throw error;
  }
};
