import AmbitoDolar from '@ambito-dolar/core';

import { generateScreenshot } from '../libs/chrome';
import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const {
    type,
    title = AmbitoDolar.getNotificationTitle(type),
    caption,
    generate_only,
    targets,
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
      generate_only,
      targets,
    })
  );
  const promises = [];
  if (
    type !== AmbitoDolar.NOTIFICATION_VARIATION_TYPE ||
    generate_only === true
  ) {
    const screenshot_url = Shared.getSocialScreenshotUrl({
      // type: 'rates',
      title,
    });
    try {
      const {
        target_url: image_url,
        ig_file: file,
        ig_story_file: story_file,
      } = await generateScreenshot(screenshot_url);
      if (generate_only === true) {
        return { image_url };
      }
      promises.push(
        ...Shared.getSocialTriggers(
          targets,
          caption,
          image_url,
          file,
          story_file
        )
      );
    } catch (error) {
      console.warn(
        'Unable to generate the screenshot for notification',
        JSON.stringify({ type, title, error: error.message })
      );
      // send as plain
    }
  }
  // when NOTIFICATION_VARIATION_TYPE or error
  if (promises.length === 0) {
    promises.push(...Shared.getSocialTriggers(targets, caption));
  }
  const results = await Promise.all(promises);
  console.info('Completed', JSON.stringify(results));
  return results;
  // screenshot generation on local environment
  /* if (type !== AmbitoDolar.NOTIFICATION_VARIATION_TYPE) {
      const { file } = await generateScreenshot(screenshot_url);
      const { mime } = await FileType.fromBuffer(file);
      res.statusCode = 200;
      res.setHeader('Content-Type', mime);
      res.end(file);
    } else {
      throw new Error('No data available');
    } */
});
