// the website phone, light and dark, for the website and the root README
// the iPhone rates and dark captures in the black bezel at its full size, transparent around it
// reads the raw captures run.sh leaves in out/raw and writes straight into the website assets
// run by run.sh, see docs/store-screenshots.md
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';

import { drawDevice, frameImage } from './compose.ts';
import { DEVICES } from './config.ts';

const here = import.meta.dirname;
// the bezel the iPhone set uses, at its own size
const iphone = DEVICES['iphone-6.9']!;
const { width, height, screen, screenRadius } = iphone.frame;
const bezel = await frameImage(iphone);
const images = `${here}/../website/src/assets/images`;
const placed = {
  frame: { left: 0, top: 0, width, height },
  screen: { left: screen.x, top: screen.y, ...screen, radius: screenRadius },
  rotate: 0,
};

for (const [scene, file] of [
  ['rates', 'phone.png'],
  ['dark', 'phone-dark.png'],
]) {
  const shot = await loadImage(`${here}/out/raw/iphone-6.9/${scene}.png`);
  const canvas = createCanvas(width, height);
  drawDevice(canvas.getContext('2d'), placed, shot, bezel);
  await writeFile(`${images}/${file}`, await canvas.encode('png'));
  console.log(`wrote ${file}`);
}
