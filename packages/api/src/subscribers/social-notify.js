import AmbitoDolar from '@ambito-dolar/core';

import { generateScreenshot } from '../libs/chrome';
import { publish as publishToInstagram } from '../libs/instagram';
import { publish as publishToMastodon } from '../libs/masto';
import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const {
    type,
    title = AmbitoDolar.getNotificationTitle(type),
    caption,
    ig_only,
    mastodon_only,
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
      mastodon_only,
      generate_only,
    })
  );
  const screenshot_url = Shared.getSocialScreenshotUrl({
    // type: 'rates',
    title,
  });
  const promises = [];
  if (
    type !== AmbitoDolar.NOTIFICATION_VARIATION_TYPE ||
    generate_only === true
  ) {
    try {
      const {
        file,
        target_url: image_url,
        ig_file,
        ig_story_file,
      } = await generateScreenshot(screenshot_url);
      if (generate_only === true) {
        return { image_url };
      }
      if (mastodon_only !== true) {
        promises.push(publishToInstagram(ig_file, caption, ig_story_file));
      }
      if (ig_only !== true) {
        promises.push(publishToMastodon(caption, file));
      }
      if (ig_only !== true && mastodon_only !== true) {
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
  if (promises.length === 0) {
    if (ig_only !== true) {
      promises.push(publishToMastodon(caption));
    }
    if (ig_only !== true && mastodon_only !== true) {
      promises.push(Shared.triggerSendSocialNotificationsEvent(caption));
    }
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
