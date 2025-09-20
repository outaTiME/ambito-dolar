import AmbitoDolar from '@ambito-dolar/core';
import chromium from '@sparticuz/chromium';
import prettyMilliseconds from 'pretty-ms';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

import Shared from './shared';

export const generateScreenshot = async (url, opts) => {
  const start_time = Date.now();
  const isSquare = opts?.square === true;
  const browser = await puppeteer.launch({
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
    // pass,
  });
  await page.setViewport({
    width: AmbitoDolar.VIEWPORT_PORTRAIT_WIDTH,
    height: AmbitoDolar.VIEWPORT_PORTRAIT_STORY_HEIGHT,
    deviceScaleFactor: 2,
  });
  const story_file = await page.screenshot({
    // pass,
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
    .png({
      // pass
    })
    .toBuffer();
  // parellelize image processing
  const [target_url, target_story_url, ig_sharp_file, ig_sharp_story_file] =
    await Promise.all([
      // image hosting service
      Shared.storeImgurFile(sharp_file.toString('base64')),
      Shared.storeImgurFile(story_file.toString('base64')),
      // Shared.storeImgbbFile(sharp_file.toString('base64')),
      // ig feed image
      sharp(sharp_file)
        .jpeg({
          quality: 100,
          chromaSubsampling: '4:4:4',
        })
        .toBuffer(),
      // ig story image
      sharp(story_file)
        .resize({
          width: AmbitoDolar.SOCIAL_IMAGE_WIDTH,
          height: AmbitoDolar.SOCIAL_STORY_IMAGE_HEIGHT,
        })
        .jpeg({
          quality: 100,
          chromaSubsampling: '4:4:4',
        })
        .toBuffer(),
    ]);
  const duration = prettyMilliseconds(Date.now() - start_time);
  console.info(
    'Screenshot completed',
    JSON.stringify({
      url,
      target_url,
      target_story_url,
      duration,
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
