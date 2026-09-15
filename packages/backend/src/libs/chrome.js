import AmbitoDolar from '@ambito-dolar/core';
import chromium from '@sparticuz/chromium';
import imageType from 'image-type';
import prettyBytes from 'pretty-bytes';
import { launch } from 'puppeteer-core';
import sharp from 'sharp';

import Shared from './shared';

const storeS3File = async (buffer, isStory = false) => {
  const { ext = 'jpg', mime = 'image/jpeg' } = (await imageType(buffer)) || {};
  const folder = isStory ? 'social-images/stories' : 'social-images';
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  return Shared.storeObject(key, buffer, false, {
    ContentType: mime,
    CacheControl: 'public, max-age=31536000',
  }).then(({ url }) => url);
};

// jpeg compression settings optimized for instagram
const JPEG_OPTIONS = {
  quality: 92,
  chromaSubsampling: '4:4:4',
  mozjpeg: true,
};

export const generateScreenshot = async (url, opts) => {
  const start_time = Date.now();
  const isSquare = opts?.square === true;
  const browser = await launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: AmbitoDolar.VIEWPORT_PORTRAIT_WIDTH,
    height: isSquare
      ? AmbitoDolar.VIEWPORT_PORTRAIT_WIDTH
      : AmbitoDolar.VIEWPORT_PORTRAIT_HEIGHT,
    deviceScaleFactor: 2,
  });
  await page.emulateTimezone(AmbitoDolar.TIMEZONE);
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);
  await page.goto(url, { waitUntil: 'networkidle0' });
  // https://pptr.dev/#?product=Puppeteer&version=v5.2.1&show=api-pageselector
  // FIXME: throw exception when invalid page contents using page.$$('svg')
  const file = await page.screenshot({
    // pass
  });
  await page.setViewport({
    width: AmbitoDolar.VIEWPORT_PORTRAIT_WIDTH,
    height: AmbitoDolar.VIEWPORT_PORTRAIT_STORY_HEIGHT,
    deviceScaleFactor: 2,
  });
  const story_file = await page.screenshot({
    // pass
  });
  await browser.close();
  // resize images in memory
  const sharp_file = await sharp(file)
    .resize({
      width: AmbitoDolar.SOCIAL_IMAGE_WIDTH,
      height: isSquare
        ? AmbitoDolar.SOCIAL_IMAGE_WIDTH
        : AmbitoDolar.SOCIAL_IMAGE_HEIGHT,
    })
    .jpeg(JPEG_OPTIONS)
    .toBuffer();
  const sharp_story_file = await sharp(story_file)
    .resize({
      width: AmbitoDolar.SOCIAL_IMAGE_WIDTH,
      height: AmbitoDolar.SOCIAL_STORY_IMAGE_HEIGHT,
    })
    .jpeg(JPEG_OPTIONS)
    .toBuffer();
  // parallelize image upload
  const [target_url, target_story_url, ig_sharp_file, ig_sharp_story_file] =
    await Promise.all([
      storeS3File(sharp_file),
      storeS3File(sharp_story_file, true),
      sharp_file,
      sharp_story_file,
    ]);
  const duration = AmbitoDolar.formatDuration(Date.now() - start_time);
  const file_size = prettyBytes(sharp_file.length, { space: false });
  const story_file_size = prettyBytes(sharp_story_file.length, {
    space: false,
  });
  console.info(
    'Screenshot completed',
    JSON.stringify({
      url,
      target_url,
      target_story_url,
      duration,
      file_size,
      story_file_size,
    }),
  );
  return {
    file: sharp_file,
    target_url,
    target_story_url,
    ig_file: ig_sharp_file,
    ig_story_file: ig_sharp_story_file,
  };
};
