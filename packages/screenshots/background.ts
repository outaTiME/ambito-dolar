// the marble of background.svg, scaled to cover and cut from its middle
// one strip per device, as wide as all its scenes side by side, so the marble runs on from one
// screenshot into the next, compose.ts cuts scene i at -i tile widths
// plus the Play feature graphic background and a social network header, 1500x500
// run by run.sh, see docs/store-screenshots.md
import { createCanvas, Image } from '@napi-rs/canvas';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { DEVICES, SCENES, THEME } from './config.ts';

const here = import.meta.dirname;
const svg = await readFile(`${here}/background.svg`, 'utf8');
const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/)!.map(Number);

const render = async (width: number, height: number, file: string) => {
  const scale = Math.max(width / w, height / h);
  const bw = width / scale;
  const bh = height / scale;
  // only the band the image shows is rasterized, the whole drawing at the iPad width runs past
  // a gigabyte
  const band = svg.replace(/<svg\b[^>]*>/, (tag) =>
    tag
      .replace(/\s(?:width|height|viewBox)="[^"]*"/g, '')
      .replace(
        '<svg',
        `<svg width="${width}" height="${height}" viewBox="${(w - bw) / 2} ${(h - bh) / 2} ${bw} ${bh}"`,
      ),
  );
  const image = new Image();
  image.src = Buffer.from(band);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  // the drawing leaves a few pixels transparent, the theme color under it keeps every image opaque
  ctx.fillStyle = THEME.background;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  await writeFile(`${here}/${file}`, await canvas.encode('png'));
  console.log(`${file} ${width}x${height}`);
};

await mkdir(`${here}/out/background`, { recursive: true });
await mkdir(`${here}/release`, { recursive: true });
// at once, encode runs on the native thread pool
await Promise.all([
  ...Object.entries(DEVICES).map(([key, { screenshot }]) =>
    render(
      screenshot.width * SCENES.length,
      screenshot.height,
      `out/background/${key}.png`,
    ),
  ),
  render(1024, 500, 'out/background/feature-graphic.png'),
  render(1500, 500, 'release/social-header.png'),
]);
