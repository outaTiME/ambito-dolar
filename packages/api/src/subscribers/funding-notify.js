import { generateScreenshot } from '../libs/chrome';
import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const { generate_only, targets } = JSON.parse(event.Records[0].Sns.Message);
  console.info(
    'Message received',
    JSON.stringify({
      generate_only,
      targets,
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
      target_url: image_url,
      ig_file: file,
      ig_story_file: story_file,
    } = await generateScreenshot(screenshot_url, {
      square: true,
    });
    if (generate_only === true) {
      return { image_url };
    }
    promises.push(
      ...Shared.getSocialTriggers(targets, caption, image_url, file, story_file)
    );
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
