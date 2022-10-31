import { generateScreenshot } from '../libs/chrome';
import { publish as publishToInstagram } from '../libs/instagram';
import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const { ig_only, generate_only } = JSON.parse(event.Records[0].Sns.Message);
  console.info(
    'Message received',
    JSON.stringify({
      ig_only,
      generate_only,
    })
  );
  const screenshot_url = Shared.getSocialScreenshotUrl({
    type: 'funding',
  });
  const caption = [
    'Esta aplicación es gratuita, de código abierto, sin publicidades y opera de forma totalmente transparente compartiendo sus métricas mensuales con la comunidad.',
    'Recordamos que tu contribución es de suma importancia para su desarrollo y mantenimiento.',
    'https://cafecito.app/ambitodolar',
  ].join('\r\n');
  const promises = [];
  try {
    const { target_url: image_url, ig_file: file } = await generateScreenshot(
      screenshot_url,
      {
        square: true,
      }
    );
    if (generate_only === true) {
      return { image_url };
    }
    promises.push(publishToInstagram(file, caption));
    if (ig_only !== true) {
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
