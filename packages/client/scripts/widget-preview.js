// Generates the previewImage PNG for an android widget from a live device render.
//
//   node scripts/widget-preview.js assets/widgets/android-rate-2x2.png
//   node scripts/widget-preview.js assets/widgets/android-rate-2x2.png --size 716 --index 1
//   node scripts/widget-preview.js assets/widgets/android-rate-2x2.png --device emulator-5554
//
// Place the widget on the home screen, leave it visible, then run this with a device
// connected. It screencaps, finds the card, cuts it out with transparent rounded
// corners and writes the asset. Run `expo prebuild --platform android` afterwards to
// copy it into res/drawable.
//
// Corners are neutralized to the card color BEFORE scaling. Scaling first would bleed
// the wallpaper into the rounded edge and no mask can take it back out.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { parseArgs } = require('util');

// the 20dp corner of widget_card_background.xml over the 130dp a 2x2 card reports
const RADIUS_RATIO = 20 / 130;
// a card pixel is this dark, the launcher wallpaper never is
const DARK = 30;
// pulls the cut inside the antialiased boundary so no wallpaper survives
const INSET = 1.5;
const SUPERSAMPLE = 4;

const screencap = (device) => {
  const target = device ? ['-s', device] : [];
  try {
    const png = execFileSync(
      'adb',
      [...target, 'exec-out', 'screencap', '-p'],
      {
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    return PNG.sync.read(png);
  } catch (e) {
    const reason = String(e.stderr ?? e.message).trim();
    console.error(`adb screencap failed: ${reason}`);
    if (reason.includes('more than one device')) {
      console.error('pass --device <serial>, adb devices lists them');
    }
    process.exit(1);
  }
};

const findCards = (img) => {
  const { width, height, data } = img;
  const isDark = (x, y) => {
    const i = (y * width + x) * 4;
    return data[i] < DARK && data[i + 1] < DARK && data[i + 2] < DARK;
  };
  // a card column is dark somewhere, text rows would split a single-row scan
  const columns = new Uint8Array(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isDark(x, y)) {
        columns[x] = 1;
      }
    }
  }
  // runs of set flags longer than a card side, the index of every short run is noise
  const runs = (flags, length) => {
    const found = [];
    let start = null;
    for (let i = 0; i <= length; i++) {
      if (i < length && flags[i]) {
        if (start === null) {
          start = i;
        }
      } else {
        if (start !== null && i - start > 150) {
          found.push({ start, size: i - start });
        }
        start = null;
      }
    }
    return found;
  };
  const cards = [];
  for (const column of runs(columns, width)) {
    // cards stacked in the in app preview share a column band, split it by rows too.
    // a whole row of the band, not a single scanline, text would break that one
    const band = new Uint8Array(height);
    for (let y = 0; y < height; y++) {
      for (let x = column.start; x < column.start + column.size; x++) {
        if (isDark(x, y)) {
          band[y] = 1;
          break;
        }
      }
    }
    for (const row of runs(band, height)) {
      // and split that row back by columns. Two widgets sitting side by side share one column
      // band, and the first pass hands back the pair as a single card twice as wide as it is
      // tall. Scanning inside the row separates them because the gap between them is wallpaper
      const strip = new Uint8Array(width);
      for (let x = column.start; x < column.start + column.size; x++) {
        for (let y = row.start; y < row.start + row.size; y++) {
          if (isDark(x, y)) {
            strip[x] = 1;
            break;
          }
        }
      }
      for (const cell of runs(strip, width)) {
        cards.push({
          x: cell.start,
          y: row.start,
          width: cell.size,
          height: row.size,
        });
      }
    }
  }
  return cards;
};

// distance outside the rounded rect, 0 when inside
const outsideBy = (x, y, size, radius) => {
  const dx = Math.max(radius - x, 0, x - (size - radius));
  const dy = Math.max(radius - y, 0, y - (size - radius));
  return Math.hypot(dx, dy) - radius;
};

const cutCard = (img, card) => {
  const size = Math.min(card.width, card.height);
  const radius = size * RADIUS_RATIO;
  const out = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const si = ((card.y + y) * img.width + (card.x + x)) * 4;
      const di = (y * size + x) * 4;
      const keep = outsideBy(x + 0.5, y + 0.5, size, radius) < -INSET;
      out.data[di] = keep ? img.data[si] : 0;
      out.data[di + 1] = keep ? img.data[si + 1] : 0;
      out.data[di + 2] = keep ? img.data[si + 2] : 0;
      out.data[di + 3] = 255;
    }
  }
  return out;
};

const resize = (img, size) => {
  if (img.width === size) {
    return img;
  }
  const out = new PNG({ width: size, height: size });
  const scale = (img.width - 1) / (size - 1);
  for (let y = 0; y < size; y++) {
    const sy = y * scale;
    const y0 = Math.floor(sy);
    const y1 = Math.min(y0 + 1, img.height - 1);
    const fy = sy - y0;
    for (let x = 0; x < size; x++) {
      const sx = x * scale;
      const x0 = Math.floor(sx);
      const x1 = Math.min(x0 + 1, img.width - 1);
      const fx = sx - x0;
      const di = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top =
          img.data[(y0 * img.width + x0) * 4 + c] * (1 - fx) +
          img.data[(y0 * img.width + x1) * 4 + c] * fx;
        const bottom =
          img.data[(y1 * img.width + x0) * 4 + c] * (1 - fx) +
          img.data[(y1 * img.width + x1) * 4 + c] * fx;
        out.data[di + c] = Math.round(top * (1 - fy) + bottom * fy);
      }
      out.data[di + 3] = 255;
    }
  }
  return out;
};

const maskCorners = (img) => {
  const size = img.width;
  const radius = size * RADIUS_RATIO;
  const out = new PNG({ width: size, height: size });
  let transparent = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const px = x + (sx + 0.5) / SUPERSAMPLE;
          const py = y + (sy + 0.5) / SUPERSAMPLE;
          if (outsideBy(px, py, size, radius) <= 0) {
            hits += 1;
          }
        }
      }
      const coverage = hits / (SUPERSAMPLE * SUPERSAMPLE);
      const i = (y * size + x) * 4;
      // partial pixels take the card color, an interpolated one would fringe
      const partial = coverage > 0 && coverage < 1;
      out.data[i] = partial ? 0 : img.data[i];
      out.data[i + 1] = partial ? 0 : img.data[i + 1];
      out.data[i + 2] = partial ? 0 : img.data[i + 2];
      out.data[i + 3] = Math.round(coverage * 255);
      if (coverage === 0) {
        transparent += 1;
      }
    }
  }
  return { out, transparent };
};

const {
  values: { size = '716', index = '0', device = process.env.ANDROID_SERIAL },
  positionals: [output],
} = parseArgs({
  options: {
    size: { type: 'string' },
    index: { type: 'string' },
    device: { type: 'string' },
  },
  allowPositionals: true,
});
if (!output) {
  console.error(
    'usage: node scripts/widget-preview.js <output.png> [--size 716] [--index 0] [--device serial]',
  );
  process.exit(1);
}

const screen = screencap(device);
const cards = findCards(screen);
if (cards.length === 0) {
  console.error('no widget card found, leave it visible on the home screen');
  process.exit(1);
}
console.info(
  `found ${cards.length} card(s):`,
  cards.map((c) => `${c.width}x${c.height}@${c.x},${c.y}`).join(' '),
);
const card = cards[Number(index)];
if (!card) {
  console.error(`no card at index ${index}`);
  process.exit(1);
}

const native = cutCard(screen, card);
const { out, transparent } = maskCorners(resize(native, Number(size)));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, PNG.sync.write(out));
console.info(
  `wrote ${output} ${size}x${size} from a ${native.width}px render, ${transparent} transparent px`,
);
