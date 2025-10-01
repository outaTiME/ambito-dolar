import AmbitoDolar from '@ambito-dolar/core';
import chromium from '@sparticuz/chromium';
import imageType from 'image-type';
import prettyMilliseconds from 'pretty-ms';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

/* eslint-disable no-unused-vars */

// not working in telegram
const storeImgurFile = (imageBase64) =>
  // AmbitoDolar.fetch('https://api.imgur.com/3/image', {
  AmbitoDolar.fetch('https://api.imgur.com/3/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
    },
    body: JSON.stringify({
      image: imageBase64,
      type: 'base64',
    }),
  }).then(async (response) => {
    const { data } = await response.json();
    return data.link;
  });

// not supported in instagram
const storeImgbbFile = (imageBase64) =>
  AmbitoDolar.fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    body: new URLSearchParams({
      key: process.env.IMGBB_KEY,
      image: imageBase64,
    }),
  }).then(async (response) => {
    const { data } = await response.json();
    return data.url;
  });

/* eslint-enable no-unused-vars */

const storeCatboxFile = async (buffer) => {
  const type = await imageType(buffer);
  if (!type) {
    throw new Error('Unsupported or unknown image type');
  }
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append(
    'fileToUpload',
    new Blob([buffer], { type: type.mime }),
    `upload.${type.ext}`,
  );
  const res = await AmbitoDolar.fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form,
  });
  const url = (await res.text()).trim();
  if (!url.startsWith('http')) {
    throw new Error(`Catbox upload failed: ${url}`);
  }
  return url;
};

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
    // required by instagram
    .jpeg({
      quality: 100,
      chromaSubsampling: '4:4:4',
    })
    .toBuffer();
  const sharp_story_file = await sharp(story_file)
    .resize({
      width: AmbitoDolar.SOCIAL_IMAGE_WIDTH,
      height: AmbitoDolar.SOCIAL_STORY_IMAGE_HEIGHT,
    })
    // required by instagram
    .jpeg({
      quality: 100,
      chromaSubsampling: '4:4:4',
    })
    .toBuffer();
  // parellelize image processing
  const [target_url, target_story_url, ig_sharp_file, ig_sharp_story_file] =
    await Promise.all([
      // image hosting service
      // storeImgurFile(sharp_file.toString('base64')),
      // storeImgurFile(sharp_story_file.toString('base64')),
      // storeImgbbFile(sharp_file.toString('base64')),
      // storeImgbbFile(sharp_story_file.toString('base64')),
      storeCatboxFile(sharp_file),
      storeCatboxFile(sharp_story_file),
      sharp_file,
      sharp_story_file,
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
