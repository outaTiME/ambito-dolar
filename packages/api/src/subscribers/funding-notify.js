import { generateScreenshot } from '../libs/chrome';
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
  const screenshot_url = Shared.getSocialScreenshotUrl({
    type: 'funding',
    earlier,
  });
  const caption = [
    'Recordá que tu contribución es de suma importancia para el desarrollo y mantenimiento de esta aplicación.',
    'https://cafecito.app/ambitodolar',
  ].join(' ');
  try {
    const {
      target_url: image_url,
      target_story_url: image_story_url,
      ig_file: file,
      ig_story_file: story_file,
    } = await generateScreenshot(screenshot_url, {
      square: true,
    });
    if (generate_only === true) {
      return { image_url, image_story_url };
    }
    const results = await Shared.triggerSocials(
      targets,
      caption,
      image_url,
      image_story_url,
      file,
      story_file,
    );
    console.info('Completed', JSON.stringify(results));
    return results;
  } catch (error) {
    console.warn(
      'Unable to generate the screenshot for notification',
      JSON.stringify({ error: error.message }),
    );
  }
});
