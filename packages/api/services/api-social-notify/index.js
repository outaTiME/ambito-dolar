const AmbitoDolar = require('@ambito-dolar/core');
const chrome = require('chrome-aws-lambda');
const { IgApiClient } = require('instagram-private-api');
const puppeteer = require('puppeteer-core');

const { Shared } = require('../../lib/shared');

const getPuppeteerOptions = async () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      args: [],
      executablePath:
        process.platform === 'win32'
          ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
          : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
    };
  }
  return {
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: chrome.headless,
  };
};

// TODO: use microlink.io instead of local puppeteer (???)
// https://github.com/MaximeHeckel/carbonara/blob/master/api/_lib/screenshot.ts
const generateScreenshot = async (type, title) => {
  const start_time = Date.now();
  const screenshot_url = Shared.getSocialScreenshotUrl(title);
  const options = await getPuppeteerOptions();
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await page.setViewport({
    width: AmbitoDolar.WEB_VIEWPORT_SIZE,
    height: AmbitoDolar.WEB_VIEWPORT_SIZE,
    deviceScaleFactor: 2,
  });
  await page.emulateTimezone(AmbitoDolar.TIMEZONE);
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);
  await page.goto(screenshot_url, { waitUntil: 'networkidle0' });
  // https://pptr.dev/#?product=Puppeteer&version=v5.2.1&show=api-pageselector
  // FIXME: throw exception when invalid page contents using page.$$('svg')
  const image_type = 'jpeg';
  const file = await page.screenshot({
    type: image_type,
  });
  await page.setViewport({
    width: AmbitoDolar.WEB_VIEWPORT_SIZE,
    height: AmbitoDolar.WEB_VIEWPORT_STORY_HEIGHT,
    deviceScaleFactor: 2,
  });
  const story_file = await page.screenshot({
    type: image_type,
  });
  await browser.close();
  const duration = (Date.now() - start_time) / 1000;
  // store image using imgur
  /* const { link: target_url } = await Shared.storePublicBase64ImageFile(
    file.toString('base64')
  ); */
  // store image on s3
  const key = `rate-images/${AmbitoDolar.getTimezoneDate().format()}-${type}`;
  const { Location: target_url } = await Shared.storePublicFileObject(
    key,
    file
  );
  console.info(
    'Screenshot completed',
    JSON.stringify({
      screenshot_url,
      target_url,
      duration,
    })
  );
  return {
    file,
    story_file,
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
    });
  }
  const duration = (Date.now() - start_time) / 1000;
  return {
    status,
    upload_id,
    media_id,
    duration,
  };
};

export default async (req, res) => {
  try {
    // TODO: export SNS payload processing to generic
    let payload = req.body;
    // https://stackoverflow.com/a/22871339/460939
    // parse body when request comes from SNS as text/plain
    // force content type when request comes from SNS
    const sns_message_type = req.headers['x-amz-sns-message-type'];
    if (sns_message_type) {
      // console.debug('Message received', sns_message_type, req.body);
      // some logs lost when "manually" change the content-type
      // req.headers['content-type'] = 'application/json; charset=utf-8';
      // req.headers['content-type'] = 'application/json';
      payload = JSON.parse(req.body);
      if (
        sns_message_type === 'SubscriptionConfirmation' ||
        sns_message_type === 'UnsubscribeConfirmation'
      ) {
        console.debug('Confirmation message received', payload);
        return Shared.serviceResponse(res, 200, payload);
      }
    }
    Shared.assertAuthenticated(req, payload);
    const {
      type = req.query.type,
      title = req.query.title,
      caption = req.query.caption,
      ig_only = req.query.ig_only,
      generate_only = req.query.generate_only,
    } = payload || {};
    // must required for social notification
    if (!type || !title || !caption) {
      throw new Error(
        'A request query parameter is malformed, missing or has an invalid value'
      );
    }
    console.info(
      'Message received',
      JSON.stringify({
        type,
        title,
        caption,
      })
    );
    if (generate_only !== undefined) {
      const { target_url: image_url } = await generateScreenshot(type, title);
      Shared.serviceResponse(res, 200, { image_url });
    } else {
      const promises = [];
      if (type !== AmbitoDolar.NOTIFICATION_VARIATION_TYPE) {
        try {
          const {
            file,
            story_file,
            target_url: image_url,
          } = await generateScreenshot(type, title);
          promises.push(publishToInstagram(file, story_file, caption));
          if (ig_only === undefined) {
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
      if (promises.length === 0 && ig_only === undefined) {
        promises.push(Shared.triggerSendSocialNotificationsEvent(caption));
      }
      const results = await Promise.all(promises);
      console.info('Completed', JSON.stringify(results));
      Shared.serviceResponse(res, 200, results);
    }
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
  } catch (error) {
    console.error('Failed', error);
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
