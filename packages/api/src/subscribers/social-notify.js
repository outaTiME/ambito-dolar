import AmbitoDolar from '@ambito-dolar/core';
import chrome from '@sparticuz/chrome-aws-lambda';
import { IgApiClient } from 'instagram-private-api';
import sharp from 'sharp';

import Shared from '../libs/shared';

// chrome-aws-lambda handles loading locally vs from the Layer
const puppeteer = chrome.puppeteer;

// TODO: use microlink.io instead of puppeteer (???)
const generateScreenshot = async (type, title) => {
  const start_time = Date.now();
  const screenshot_url = Shared.getSocialScreenshotUrl(title);
  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: chrome.headless,
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: AmbitoDolar.VIEWPORT_PORTRAIT_WIDTH,
    height: AmbitoDolar.VIEWPORT_PORTRAIT_HEIGHT,
    deviceScaleFactor: 2,
  });
  await page.emulateTimezone(AmbitoDolar.TIMEZONE);
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);
  await page.goto(screenshot_url, { waitUntil: 'networkidle0' });
  // https://pptr.dev/#?product=Puppeteer&version=v5.2.1&show=api-pageselector
  // FIXME: throw exception when invalid page contents using page.$$('svg')
  // const image_type = 'png';
  const file = await page.screenshot({
    // type: image_type,
  });
  await page.setViewport({
    width: AmbitoDolar.VIEWPORT_PORTRAIT_WIDTH,
    height: AmbitoDolar.VIEWPORT_PORTRAIT_STORY_HEIGHT,
    deviceScaleFactor: 2,
  });
  const story_file = await page.screenshot({
    // type: image_type,
  });
  await browser.close();
  // resize according to IG (preserve aspect from core)
  const { data: sharp_file, info: sharp_file_info } = await sharp(file)
    .resize({
      width: AmbitoDolar.SOCIAL_IMAGE_WIDTH,
      height: AmbitoDolar.SOCIAL_IMAGE_HEIGHT,
    })
    // jpeg format required by instagram-private-api
    .jpeg({
      quality: 100,
      chromaSubsampling: '4:4:4',
    })
    .toBuffer({ resolveWithObject: true });
  const { data: sharp_story_file, info: sharp_story_file_info } = await sharp(
    story_file
  )
    .resize({
      width: AmbitoDolar.SOCIAL_IMAGE_WIDTH,
      height: AmbitoDolar.SOCIAL_STORY_IMAGE_HEIGHT,
    })
    // jpeg format required by instagram-private-api
    .jpeg({
      quality: 100,
      chromaSubsampling: '4:4:4',
    })
    .toBuffer({ resolveWithObject: true });
  // image hosting service
  const target_url = await Shared.storeImgurFile(sharp_file.toString('base64'));
  // s3
  /* const key = `rate-images/${AmbitoDolar.getTimezoneDate().format()}-${type}`;
  const { Location: target_url } = await Shared.storePublicFileObject(
    key,
    file
  ); */
  const duration = (Date.now() - start_time) / 1000;
  console.info(
    'Screenshot completed',
    JSON.stringify({
      screenshot_url,
      image_info: sharp_file_info,
      story_image_info: sharp_story_file_info,
      target_url,
      duration,
    })
  );
  return {
    // file,
    file: sharp_file,
    // story_file,
    story_file: sharp_story_file,
    target_url,
  };
};

// https://github.com/dilame/instagram-private-api/blob/3e1605831996c19e59f7b91461eea3539cd3521f/examples/story-upload.example.ts#L89
const centeredSticker = (width, height) => ({
  x: 0.5,
  y: 0.5,
  width,
  height,
  rotation: 0.0,
});

// https://github.com/dilame/instagram-private-api/blob/master/examples/session.example.ts
const publishToInstagram = async (file, story_file, caption) => {
  try {
    const IG_SESSION_KEY = 'instagram-session';
    const IG_USERNAME = process.env.IG_USERNAME;
    const IG_PASSWORD = process.env.IG_PASSWORD;
    const start_time = Date.now();
    const ig = new IgApiClient();
    ig.state.generateDevice(IG_USERNAME);
    // This function executes after every request
    ig.request.end$.subscribe(async () => {
      const serialized = await ig.state.serialize();
      delete serialized.constants; // this deletes the version info, so you'll always use the version provided by the library
      await Shared.storeJsonObject(IG_SESSION_KEY, serialized);
    });
    const serialized_session = await Shared.getJsonObject(IG_SESSION_KEY).catch(
      (error) => {
        console.warn(
          'Unable to get instagram session from bucket',
          JSON.stringify({ error: error.message })
        );
        // ignore
      }
    );
    if (serialized_session) {
      // import state accepts both a string as well as an object
      // the string should be a JSON object
      await ig.state.deserialize(serialized_session);
    }
    // This call will provoke request.end$ stream
    await ig.account.login(IG_USERNAME, IG_PASSWORD);
    // Most of the time you don't have to login after loading the state
    const {
      status,
      upload_id,
      media: { pk: media_id } = {},
    } = await ig.publish.photo({
      file,
      caption,
    });
    if (media_id) {
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

export async function handler(event) {
  const {
    type,
    title = AmbitoDolar.getNotificationTitle(type),
    caption,
    ig_only,
    generate_only,
  } = JSON.parse(event.Records[0].Sns.Message);
  // must required for social notification
  if (!type || !title || !caption) {
    throw new Error('Message is malformed, missing or has an invalid value');
  }
  console.info(
    'Message received',
    JSON.stringify({
      type,
      title,
      caption,
      ig_only,
      generate_only,
    })
  );
  if (generate_only === true) {
    const { target_url: image_url } = await generateScreenshot(type, title);
    return { image_url };
  }
  const promises = [];
  if (type !== AmbitoDolar.NOTIFICATION_VARIATION_TYPE) {
    try {
      const {
        file,
        story_file,
        target_url: image_url,
      } = await generateScreenshot(type, title);
      promises.push(publishToInstagram(file, story_file, caption));
      if (ig_only !== true) {
        promises.push(
          Shared.triggerSendSocialNotificationsEvent(caption, image_url)
        );
      }
    } catch (error) {
      console.warn(
        'Unable to generate the screenshot for notification',
        JSON.stringify({ type, title, error: error.message })
      );
      // send as plain
    }
  }
  // when NOTIFICATION_VARIATION_TYPE or error
  if (promises.length === 0 && ig_only !== true) {
    promises.push(Shared.triggerSendSocialNotificationsEvent(caption));
  }
  const results = await Promise.all(promises);
  console.info('Completed', JSON.stringify(results));
  return results;
  // screenshot generation on local environment
  /* if (type !== AmbitoDolar.NOTIFICATION_VARIATION_TYPE) {
      const { file } = await generateScreenshot(
        type,
        title
      );
      const { mime } = await FileType.fromBuffer(file);
      res.statusCode = 200;
      res.setHeader('Content-Type', mime);
      res.end(file);
    } else {
      throw new Error('No data available');
    } */
}
