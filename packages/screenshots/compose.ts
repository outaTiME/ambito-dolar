// out/raw/<device>/<scene>.png into the store screenshots, out/screenshots/<device>/es-AR
// on each tile: the marble strip, the headline, then the capture in its bezel
// the layout math comes from goldie 0.5 (MIT), cut down to the three layouts the set uses
// run by run.sh after the captures, see docs/store-screenshots.md
import {
  type Canvas,
  createCanvas,
  GlobalFonts,
  type Image,
  loadImage,
  type SKRSContext2D,
} from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { crc32, deflate } from 'node:zlib';

import {
  DEVICES,
  type Device,
  type Placement,
  type Radius,
  SCENES,
  type Scene,
  THEME,
  WATCH_PAGES,
} from './config.ts';

type Ctx = SKRSContext2D;
type Rect = { left: number; top: number; width: number; height: number };
type Placed = {
  frame: Rect;
  screen: Rect & { radius: Radius };
  rotate: number;
  zoom?: number;
};
type Copy = {
  position: 'top' | 'bottom';
  x: number;
  y: number;
  maxWidth: number;
  typeWidth: number;
};

const here = import.meta.dirname;
const FAMILY = 'FiraGO';
// a font that never registers draws the headlines in sans-serif without a word
if (!GlobalFonts.registerFromPath(`${here}/${THEME.font}`, FAMILY)) {
  throw new Error(`${THEME.font} did not register`);
}

// type and spacing as fractions of the tile width (sizes, padX) or height (padTop, padBottom)
const TYPE = {
  headlineSize: 0.082,
  headlineLineHeight: 1.08,
  headlineTracking: -0.0016,
  padX: 0.09,
  padTop: 0.055,
  padBottom: 0.05,
};
// the copy band and the space under the device in the classic fit, fractions of the tile height
const CLASSIC_COPY_HEIGHT = 0.2;
const CLASSIC_BOTTOM_MARGIN = 0.03;
// every fraction was tuned on the 6.9" tile, a wider one composes in this aspect and centres
const REF_TILE_ASPECT = 1320 / 2868;

const LAYOUTS = {
  // the device fit between the copy band and the bottom margin, centred
  classic: {
    copy: 'top',
    device: { widthRatio: 0.75, x: 0.5, rotate: 0 },
  },
  tilt: {
    copy: 'top',
    device: { widthRatio: 0.9, x: 0.5, rotate: -8 },
  },
  'copy-below': {
    copy: 'bottom',
    device: { widthRatio: 0.84, x: 0.5, rotate: 0 },
  },
} as const;

const scaleRadius = (r: Radius, k: number, plus = 0): Radius =>
  typeof r === 'number' ? r * k + plus : (r.map((v) => v * k + plus) as Radius);

// the copy and device geometry of a scene on its tile
function compose(scene: Scene, key: string, spec: Device) {
  const layout = LAYOUTS[scene.layout];
  const d: Placement = {
    ...layout.device,
    ...(scene.placements?.[key] ?? scene.device),
  };
  const geom = spec.frame;
  const tileIn = spec.screenshot;
  const tile =
    tileIn.width / tileIn.height > REF_TILE_ASPECT + 1e-6
      ? { width: tileIn.height * REF_TILE_ASPECT, height: tileIn.height }
      : tileIn;
  const dx = (tileIn.width - tile.width) / 2;
  const { width, height } = tile;
  const copyScale = spec.copyScale ?? 1;
  // portrait tiles wrap in proportion to the type, so every device breaks the same words
  const maxWidth =
    tileIn.height > tileIn.width
      ? width * copyScale * (1 - 2 * TYPE.padX)
      : tileIn.width - 2 * width * TYPE.padX;
  const top = layout.copy === 'top';
  const copy: Copy = {
    position: layout.copy,
    x: width / 2 + dx,
    y: top ? height * TYPE.padTop : height - height * TYPE.padBottom,
    maxWidth,
    typeWidth: width * copyScale,
  };

  // a wider tile sizes the device on its own width, not the reference one
  let scale = (tileIn.width * d.widthRatio) / geom.width;
  let left: number;
  if (scene.layout === 'classic') {
    const available =
      height * (1 - CLASSIC_COPY_HEIGHT - CLASSIC_BOTTOM_MARGIN);
    scale = Math.min(scale, available / geom.height);
    left = (width - geom.width * scale) / 2 + dx;
  } else {
    left = tileIn.width * d.x - (geom.width * scale) / 2;
  }
  const device: Placed = {
    // spaceEvenly places it vertically
    frame: {
      left,
      top: 0,
      width: geom.width * scale,
      height: geom.height * scale,
    },
    screen: {
      left: left + geom.screen.x * scale,
      top: geom.screen.y * scale,
      width: geom.screen.width * scale,
      height: geom.screen.height * scale,
      radius: scaleRadius(geom.screenRadius, scale),
    },
    rotate: d.rotate,
    zoom: d.zoom,
  };
  return { width: tileIn.width, height, copy, device };
}

// the same space above the copy, between it and the device and below, measured on what is drawn
// a device too tall for three spaces bleeds off the far edge
function spaceEvenly(
  c: ReturnType<typeof compose>,
  textHeight: number,
  insetTop: number,
  insetBottom: number,
  bezelInset: [number, number],
) {
  const d = c.device;
  const centre = d.frame.top + d.frame.height / 2;
  let extent: { top: number; bottom: number };
  if (d.rotate) {
    // a tilted device by its frame's rotated box
    const a = (d.rotate * Math.PI) / 180;
    const half =
      (d.frame.width * Math.abs(Math.sin(a)) +
        d.frame.height * Math.abs(Math.cos(a))) /
      2;
    extent = { top: centre - half, bottom: centre + half };
  } else {
    // an upright one by its bezel's opaque rows
    extent = {
      top: d.frame.top + d.frame.height * bezelInset[0],
      bottom: d.frame.top + d.frame.height * (1 - bezelInset[1]),
    };
  }
  const below = c.copy.position === 'bottom';
  const ink = textHeight - insetTop - insetBottom;
  const even = (c.height - ink - (extent.bottom - extent.top)) / 3;
  const space =
    even > 0
      ? even
      : below
        ? c.height - c.copy.y + insetBottom
        : c.copy.y + insetTop;
  const dy = below
    ? even > 0
      ? space - extent.top
      : c.height - 2 * space - ink - extent.bottom
    : 2 * space + ink - extent.top;
  d.frame.top += dy;
  d.screen.top += dy;
  // the copy centres in the room the drawn device leaves, a tilted one's rounded corner
  // reaches less far than its box
  const reach = d.rotate
    ? cornerExtent(d)[below ? 'bottom' : 'top']
    : extent[below ? 'bottom' : 'top'] + dy;
  const edge = ((below ? c.height - reach : reach) - ink) / 2;
  c.copy.y = below ? c.height - edge + insetBottom : edge - insetTop;
}

// how far a tilted device's rounded corners reach, the bezel ring around the screen corners
function cornerExtent(d: Placed) {
  const ring = d.screen.left - d.frame.left;
  const r = d.screen.radius;
  const radii = (typeof r === 'number' ? [r, r, r, r] : r).map((v) => v + ring);
  const w = d.frame.width / 2;
  const h = d.frame.height / 2;
  const t = (d.rotate * Math.PI) / 180;
  const centre = d.frame.top + h;
  const ys = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(
    ([sx, sy], k) =>
      sx! * (w - radii[k]!) * Math.sin(t) + sy! * (h - radii[k]!) * Math.cos(t),
  );
  return {
    top: centre + Math.min(...ys.map((y, k) => y - radii[k]!)),
    bottom: centre + Math.max(...ys.map((y, k) => y + radii[k]!)),
  };
}

// grows a zoomed device from the visible top edge of its bezel and its centre line
function zoom(d: Placed, topInset: number) {
  if (!d.zoom) {
    return;
  }
  const z = d.zoom;
  const cx = d.frame.left + d.frame.width / 2;
  const top = d.frame.top + d.frame.height * topInset;
  for (const r of [d.frame, d.screen]) {
    r.left = cx + (r.left - cx) * z;
    r.top = top + (r.top - top) * z;
    r.width *= z;
    r.height *= z;
  }
  d.screen.radius = scaleRadius(d.screen.radius, z);
}

// word wrap at the spaces
function wrapLines(ctx: Ctx, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  lines.push(line);
  return lines;
}

// measures the headline, lets the spacing move everything, then draws it centred
function drawCopy(
  ctx: Ctx,
  c: ReturnType<typeof compose>,
  text: string,
  bezelInset: [number, number],
) {
  const size = c.copy.typeWidth * TYPE.headlineSize;
  ctx.font = `400 ${size}px "${FAMILY}", sans-serif`;
  ctx.letterSpacing = `${c.copy.typeWidth * TYPE.headlineTracking}px`;
  ctx.textBaseline = 'top';
  const lines = wrapLines(ctx, text, c.copy.maxWidth);
  const step = size * TYPE.headlineLineHeight;
  const total = lines.length * step;
  // spaced by the ink of the first and last lines, the line boxes leave room around it
  const half = (step - size) / 2;
  const insetTop = half - ctx.measureText(lines[0]!).actualBoundingBoxAscent;
  const insetBottom =
    half + size - ctx.measureText(lines.at(-1)!).actualBoundingBoxDescent;
  spaceEvenly(c, total, insetTop, insetBottom, bezelInset);
  ctx.fillStyle = THEME.color;
  ctx.textAlign = 'center';
  let y = c.copy.position === 'top' ? c.copy.y : c.copy.y - total;
  for (const line of lines) {
    // the glyph box centred in the line box, as CSS line-height does
    ctx.fillText(line, c.copy.x, y + half);
    y += step;
  }
}

// the capture cover-fitted and clipped to the rounded screen, the bezel over it
export function drawDevice(ctx: Ctx, d: Placed, capture: Image, bezel: Image) {
  const { frame, screen } = d;
  ctx.save();
  if (d.rotate) {
    const cx = frame.left + frame.width / 2;
    const cy = frame.top + frame.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((d.rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  // screen and bezel edges both antialias, black runs a little under the bezel against a hairline
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.roundRect(
    screen.left - 2,
    screen.top - 2,
    screen.width + 4,
    screen.height + 4,
    scaleRadius(screen.radius, 1, 2),
  );
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(
    screen.left,
    screen.top,
    screen.width,
    screen.height,
    screen.radius,
  );
  ctx.clip();
  const scale = Math.max(
    screen.width / capture.width,
    screen.height / capture.height,
  );
  const w = capture.width * scale;
  const h = capture.height * scale;
  ctx.drawImage(
    capture,
    screen.left + (screen.width - w) / 2,
    screen.top + (screen.height - h) / 2,
    w,
    h,
  );
  ctx.restore();
  ctx.drawImage(bezel, frame.left, frame.top, frame.width, frame.height);
  ctx.restore();
}

// the transparent rows above and below the art's centre column, fractions of its height
function opaqueRows(art: Image): [number, number] {
  const canvas = createCanvas(1, art.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(art, art.width / 2, 0, 1, art.height, 0, 0, 1, art.height);
  const alpha = ctx.getImageData(0, 0, 1, art.height).data;
  const opaque = (y: number) => alpha[y * 4 + 3]! >= 128;
  let top = 0;
  while (top < art.height - 1 && !opaque(top)) {
    top++;
  }
  let bottom = art.height - 1;
  while (bottom > top && !opaque(bottom)) {
    bottom--;
  }
  return [top / art.height, (art.height - 1 - bottom) / art.height];
}

// an opaque canvas as an RGB PNG, the stores reject an alpha channel and canvas only encodes RGBA
// every row Paeth filtered, about the size canvas writes, oxipng shrinks it further when installed
export async function rgbPng(canvas: Canvas) {
  const { width, height } = canvas;
  const rgba = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  const stride = width * 3;
  const rows = Buffer.alloc((stride + 1) * height);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(stride);
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        row[x * 3 + c] = rgba[(y * width + x) * 4 + c]!;
      }
    }
    const out = (stride + 1) * y;
    rows[out] = 4;
    for (let i = 0; i < stride; i++) {
      const a = i >= 3 ? row[i - 3]! : 0;
      const b = prev[i]!;
      const c = i >= 3 ? prev[i - 3]! : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      rows[out + 1 + i] =
        row[i]! - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
    }
    prev = row;
  }
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([size, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  // 8 bit truecolor, no alpha
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', await promisify(deflate)(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export const frameImage = (spec: Device) =>
  loadImage(`${here}/frames/${spec.frame.file}`);

async function composeDevice(key: string) {
  const spec = DEVICES[key]!;
  const [bezel, marble] = await Promise.all([
    frameImage(spec),
    loadImage(`${here}/out/background/${key}.png`),
  ]);
  const inset = opaqueRows(bezel);
  const out = `${here}/out/screenshots/${key}/es-AR`;
  await mkdir(out, { recursive: true });
  // at once, the deflate runs on the native thread pool
  await Promise.all(
    SCENES.map(async (scene, i) => {
      const c = compose(scene, key, spec);
      const canvas = createCanvas(c.width, c.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = THEME.background;
      ctx.fillRect(0, 0, c.width, c.height);
      // the strip is every scene side by side, this one shows its own stretch
      const w = c.width * SCENES.length;
      ctx.drawImage(
        marble,
        -i * c.width,
        0,
        w,
        (w * marble.height) / marble.width,
      );
      drawCopy(ctx, c, scene.headline, inset);
      zoom(c.device, inset[0]);
      drawDevice(
        ctx,
        c.device,
        await loadImage(`${here}/out/raw/${key}/${scene.id}.png`),
        bezel,
      );
      const name = `${String(i + 1).padStart(2, '0')}-${scene.id}.png`;
      await writeFile(`${out}/${name}`, await rgbPng(canvas));
    }),
  );
  console.log(`${key} ${SCENES.length} screenshots`);
}

// the watch pages as captured, only without their alpha channel
async function composeWatch() {
  const out = `${here}/out/screenshots/apple-watch/es-AR`;
  await mkdir(out, { recursive: true });
  await Promise.all(
    WATCH_PAGES.map(async (page, i) => {
      const shot = await loadImage(`${here}/out/raw/apple-watch/${page}.png`);
      const canvas = createCanvas(shot.width, shot.height);
      canvas.getContext('2d').drawImage(shot, 0, 0);
      await writeFile(`${out}/0${i + 1}-${page}.png`, await rgbPng(canvas));
    }),
  );
  console.log(`apple-watch ${WATCH_PAGES.length} screenshots`);
}

// as a script, every device and the watch
// feature-graphic.ts and website-phone.ts import it
if (import.meta.main) {
  await Promise.all([
    ...Object.keys(DEVICES).map(composeDevice),
    composeWatch(),
  ]);
}
