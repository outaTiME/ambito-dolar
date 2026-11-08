// google play feature graphic, 1024x500
// the rates, the markets and the conversion, the three tabs, on framed Play phones cut by the
// bottom edge
// reads the raw captures run.sh leaves in out/raw
// run by run.sh, see docs/store-screenshots.md
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';

import { frameImage, rgbPng } from './compose.ts';
import { DEVICES } from './config.ts';

const here = import.meta.dirname;
const phone = DEVICES['pixel-10-pro']!;
const [background, frame, ...shots] = await Promise.all([
  loadImage(`${here}/out/background/feature-graphic.png`),
  frameImage(phone),
  ...['rates', 'markets', 'conversion'].map((id) =>
    loadImage(`${here}/out/raw/pixel-10-pro/${id}.png`),
  ),
]);

const WIDTH = 1024;
const HEIGHT = 500;
// a 325 px phone with 57 px between and 157 px margins, scaled to three phones in 1024 px
// the top at 0.42 of the phone width, the indicators list runs past the bottom edge
const PHONE_WIDTH = 237;
const GAP = PHONE_WIDTH * (57 / 325);
const MARGIN = (WIDTH - 3 * PHONE_WIDTH - 2 * GAP) / 2;
const TOP = PHONE_WIDTH * 0.42;

// one drawImage from 1236 px down to 219 px skips most source pixels and aliases the text,
// halving step by step averages them all
const shrink = (image: any, width: number) => {
  let src = image;
  let w = image.width;
  let h = image.height;
  while (w / 2 > width) {
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    const step = createCanvas(w, h);
    const sctx = step.getContext('2d');
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(src, 0, 0, w, h);
    src = step;
  }
  return src;
};
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingQuality = 'high';
ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);

const { width, screen, screenRadius } = phone.frame;
const k = PHONE_WIDTH / width;
const bezel = shrink(frame, PHONE_WIDTH);
for (const [i, shot] of shots.entries()) {
  const left = MARGIN + i * (PHONE_WIDTH + GAP);
  const x = left + screen.x * k;
  const y = TOP + screen.y * k;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(
    x,
    y,
    screen.width * k,
    screen.height * k,
    (screenRadius as number) * k,
  );
  ctx.clip();
  ctx.drawImage(
    shrink(shot, screen.width * k),
    x,
    y,
    screen.width * k,
    screen.height * k,
  );
  ctx.restore();
  ctx.drawImage(bezel, left, TOP, PHONE_WIDTH, frame.height * k);
}

// at the Play folder's root, next to the device folders
const out = `${here}/release/google-play/feature-graphic.png`;
await writeFile(out, await rgbPng(canvas));
console.log(`wrote ${out}`);
