// a bezel PNG measured for config.ts from its alpha: the image box, the transparent screen cutout
// around the image centre and the cutout's corner radius, run as node measure-frame.ts <png>...
// Apple's cutouts have continuous corners, their radius in config.ts sits under the measured one
import { createCanvas, loadImage } from '@napi-rs/canvas';

const OPAQUE = 128;

for (const file of process.argv.slice(2)) {
  const image = await loadImage(file);
  const { width, height } = image;
  const ctx = createCanvas(width, height).getContext('2d');
  ctx.drawImage(image, 0, 0);
  const alpha = ctx.getImageData(0, 0, width, height).data;
  const clear = (x: number, y: number) =>
    alpha[(y * width + x) * 4 + 3]! < OPAQUE;

  // out from the centre to the bezel's inner edge, vertically down the middle and a quarter in
  // the farther edge wins, a Dynamic Island stops the middle walk and a round corner the other
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const qx = Math.floor(width / 4);
  if (!clear(cx, cy)) {
    throw new Error(`${file}: the centre pixel is opaque, no screen cutout`);
  }
  let left = cx;
  while (left > 0 && clear(left - 1, cy)) {
    left--;
  }
  let right = cx;
  while (right < width - 1 && clear(right + 1, cy)) {
    right++;
  }
  const edge = (x: number, step: 1 | -1) => {
    let y = cy;
    while (y + step >= 0 && y + step < height && clear(x, y + step)) {
      y += step;
    }
    return y;
  };
  const top = Math.min(edge(cx, -1), edge(qx, -1));
  const bottom = Math.max(edge(cx, 1), edge(qx, 1));

  // the radius from the diagonal, a circular corner of radius r changes after r * (1 - 1 / sqrt 2)
  // a ring thinner than the corner leaves the cutout clear to the edge, outer radius less the ring
  const diagonal = (x: number, y: number, want: boolean) => {
    let d = 0;
    while (d < Math.min(width, height) / 2 && clear(x + d, y + d) !== want) {
      d++;
    }
    return Math.round(d / (1 - Math.SQRT1_2));
  };
  const inner = diagonal(left, top, true);
  const radius = inner > 0 ? inner : Math.max(0, diagonal(0, 0, false) - left);

  console.log(
    JSON.stringify({
      file,
      width,
      height,
      screen: {
        x: left,
        y: top,
        width: right - left + 1,
        height: bottom - top + 1,
      },
      screenRadius: radius,
    }),
  );
}
