import AmbitoDolar from '@ambito-dolar/core';
import chromium from '@sparticuz/chromium';
import imageType from 'image-type';
import prettyBytes from 'pretty-bytes';
import prettyMilliseconds from 'pretty-ms';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

import Shared from './shared';

/* eslint-disable no-unused-vars */

// imgur blocks telegram
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

// instagram does not accept imghippo links
const storeImghippoFile = async (buffer) => {
  const type = await imageType(buffer);
  if (!type) {
    throw new Error('Unsupported or unknown image type');
  }
  const form = new FormData();
  form.append(
    'file',
    new Blob([buffer], { type: type.mime }),
    `upload.${type.ext}`,
  );
  form.append('api_key', process.env.IMGHIPPO_API_KEY);
  const response = await AmbitoDolar.fetch(
    'https://api.imghippo.com/v1/upload',
    {
      method: 'POST',
      body: form,
    },
  );
  const { data } = await response.json();
  return data.url || data.view_url;
};

// service is unstable
const storeCatboxFile = async (buffer) => {
  const type = await imageType(buffer);
  if (!type) {
    throw new Error('Unsupported or unknown image type');
  }
  return Shared.promiseRetry(async (retry) => {
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
      return retry(new Error('Invalid Catbox response'));
    }
    return url;
  });
};

// reddit does not accept freeimage links
const storeFreeimageFile = async (buffer) => {
  const type = await imageType(buffer);
  if (!type) {
    throw new Error('Unsupported or unknown image type');
  }
  const form = new FormData();
  form.append('key', process.env.FREEIMAGE_API_KEY);
  form.append(
    'source',
    new Blob([buffer], { type: type.mime }),
    `upload.${type.ext}`,
  );
  const res = await AmbitoDolar.fetch('https://freeimage.host/api/1/upload', {
    method: 'POST',
    body: form,
  });
  const { image } = await res.json();
  return image.url;
};

const storeS3File = async (buffer, isStory = false) => {
  const { ext = 'jpg', mime = 'image/jpeg' } = (await imageType(buffer)) || {};
  const folder = isStory ? 'social-images/stories' : 'social-images';
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  return Shared.storeObject(key, buffer, false, {
    ContentType: mime,
    CacheControl: 'public, max-age=31536000',
  }).then(({ url }) => url);
};

/* eslint-enable no-unused-vars */

// jpeg compression settings optimized for instagram
const JPEG_OPTIONS = {
  quality: 92,
  chromaSubsampling: '4:4:4',
  mozjpeg: true,
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
      // image hosting service
      // storeImgurFile(sharp_file.toString('base64')),
      // storeImgurFile(sharp_story_file.toString('base64')),
      // storeImgbbFile(sharp_file.toString('base64')),
      // storeImgbbFile(sharp_story_file.toString('base64')),
      // storeImghippoFile(sharp_file),
      // storeImghippoFile(sharp_story_file),
      // storeCatboxFile(sharp_file),
      // storeCatboxFile(sharp_story_file),
      // storeFreeimageFile(sharp_file),
      // storeFreeimageFile(sharp_story_file),
      storeS3File(sharp_file),
      storeS3File(sharp_story_file, true),
      sharp_file,
      sharp_story_file,
    ]);
  const duration = prettyMilliseconds(Date.now() - start_time);
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
