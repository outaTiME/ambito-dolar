import { generateScreenshot } from '../libs/chrome';
import { publish as publishToInstagram } from '../libs/instagram';
import { publish as publishToMastodon } from '../libs/masto';
import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const { ig_only, mastodon_only, generate_only } = JSON.parse(
    event.Records[0].Sns.Message
  );
  console.info(
    'Message received',
    JSON.stringify({
      ig_only,
      mastodon_only,
      generate_only,
    })
  );
  const screenshot_url = Shared.getSocialScreenshotUrl({
    type: 'funding',
  });
  const caption = [
    'Recordá que tu contribución es de suma importancia para el desarrollo y mantenimiento de esta aplicación.',
    'https://cafecito.app/ambitodolar',
  ].join(' ');
  const promises = [];
  try {
    const {
      file,
      target_url: image_url,
      ig_file,
      ig_story_file,
    } = await generateScreenshot(screenshot_url, {
      square: true,
    });
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
      JSON.stringify({ error: error.message })
    );
  }
  const results = await Promise.all(promises);
  console.info('Completed', JSON.stringify(results));
  return results;
});
