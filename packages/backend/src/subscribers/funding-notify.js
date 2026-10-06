import { publishScreenshot } from '../libs/chrome';
import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const { generate_only, targets, earlier } = JSON.parse(
    event.Records[0].Sns.Message,
  );
  console.info(
    'Message received',
    JSON.stringify({
      generate_only,
      targets,
      earlier,
    }),
  );
  const caption = [
    'Recordá que tu contribución es de suma importancia para el desarrollo y mantenimiento de esta aplicación.',
    'https://cafecito.app/ambitodolar',
  ].join(' ');
  const hasScreenshotUrl = !!process.env.SOCIAL_SCREENSHOT_URL;
  if (!hasScreenshotUrl) {
    console.warn('SOCIAL_SCREENSHOT_URL is missing, skipping funding notify');
    return {
      skipped: true,
      reason: 'MISSING_SOCIAL_SCREENSHOT_URL',
    };
  }
  const screenshot_url = Shared.getSocialScreenshotUrl({
    type: 'funding',
    earlier,
  });
  try {
    const results = await publishScreenshot(screenshot_url, {
      square: true,
      generate_only,
      targets,
      caption,
    });
    if (generate_only === true) {
      return results;
    }
    console.info('Completed', JSON.stringify(results));
    return results;
  } catch (error) {
    console.warn(
      'Unable to generate the screenshot for notification',
      JSON.stringify({ error: error.message }),
    );
  }
});
