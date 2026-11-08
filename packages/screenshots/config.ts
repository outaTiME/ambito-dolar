// the store screenshots, its devices, frames, look and scenes, see docs/store-screenshots.md
// read by run.sh, capture.sh, compose.ts, background.ts and the extras

type Size = { width: number; height: number };
// one radius, or four from the top left clockwise like canvas roundRect
export type Radius = number | [number, number, number, number];
type Frame = Size & {
  file: string;
  screen: Size & { x: number; y: number };
  screenRadius: Radius;
};
export type Placement = {
  // bezel width as a fraction of the tile width
  widthRatio: number;
  // device centre as a fraction of the tile width, classic centres it
  x: number;
  // degrees, clockwise, around the device centre
  rotate: number;
  // grows the device from its top edge, the rest runs off the bottom
  zoom?: number;
};
export type Device = {
  platform: 'ios' | 'android';
  // the simulator name, or the AVD hw.device.name profile
  name: string;
  // what every capture has to measure, a changed simulator or AVD fails there
  native: Size;
  // the store upload size
  screenshot: Size;
  // type larger than the 6.9 reference, for the wide tiles
  copyScale?: number;
  posture?: 'closed';
  orientation?: 'LandscapeLeft';
  frame: Frame;
};

// Apple's product bezels and the Figma Android frames, see frames/README.md
const FRAMES = {
  iphone: {
    file: '18-pro-max-black.png',
    width: 1470,
    height: 3000,
    screen: { x: 75, y: 66, width: 1320, height: 2868 },
    screenRadius: 150,
  },
  duo: {
    file: 'duo-outer-night-sky.png',
    width: 1574,
    height: 2194,
    screen: { x: 88, y: 80, width: 1398, height: 2034 },
    // the hinge side corners are tight, the outer side follows the rounded edge
    screenRadius: [24, 174, 174, 24],
  },
  ipad: {
    file: 'ipad-pro-m5-11-space-black-landscape.png',
    width: 2640,
    height: 1880,
    screen: { x: 110, y: 106, width: 2420, height: 1668 },
    screenRadius: 58,
  },
  android: {
    file: 'android-compact-black.png',
    width: 1335,
    height: 2841,
    screen: { x: 45, y: 45, width: 1236, height: 2751 },
    screenRadius: 89,
  },
  // cleared to the Pixel Tablet display radius, 31 px at 2560 in the SDK skin
  androidTablet: {
    file: 'android-expanded-black.png',
    width: 4110,
    height: 2670,
    screen: { x: 135, y: 135, width: 3840, height: 2400 },
    screenRadius: 48,
  },
} satisfies Record<string, Frame>;

// the keys are the output folders and store slots, keep them across hardware changes
// run in this order, one at a time
export const DEVICES: Record<string, Device> = {
  'iphone-6.9': {
    platform: 'ios',
    name: 'iPhone 18 Pro Max',
    native: { width: 1320, height: 2868 },
    screenshot: { width: 1320, height: 2868 },
    frame: FRAMES.iphone,
  },
  // the cover panel folded, it composes like the iPhone
  'iphone-duo-outer': {
    platform: 'ios',
    name: 'iPhone Duo',
    posture: 'closed',
    native: { width: 1398, height: 2034 },
    screenshot: { width: 1398, height: 2034 },
    copyScale: 1.3,
    frame: FRAMES.duo,
  },
  // the 11" screen in the 13" upload slot, landscape like Apple's own iPad sets
  'ipad-11': {
    platform: 'ios',
    name: 'iPad Pro 11-inch (M5)',
    orientation: 'LandscapeLeft',
    native: { width: 2420, height: 1668 },
    screenshot: { width: 2752, height: 2064 },
    copyScale: 1.3,
    frame: FRAMES.ipad,
  },
  // the Pixel 9 Pro AVD, it shares the 1280x2856 screen
  'pixel-10-pro': {
    platform: 'android',
    name: 'pixel_9_pro',
    native: { width: 1280, height: 2856 },
    screenshot: { width: 1080, height: 1920 },
    frame: FRAMES.android,
  },
  // the 16:9 tablet slots, an AVD landscape by nature, a turned one hands sideways screenshots
  'pixel-tablet': {
    platform: 'android',
    name: 'pixel_tablet',
    native: { width: 2560, height: 1600 },
    screenshot: { width: 2560, height: 1440 },
    frame: FRAMES.androidTablet,
  },
};

// the watch simulator and the app pages capture.sh swipes through, in store order
export const WATCH_PAGES = ['rates', 'markets', 'conversion'];
export const WATCH = 'Apple Watch Ultra 4 (49mm)';

export const THEME = {
  background: '#f2f2f2',
  color: '#000000',
  font: '../client/assets/fonts/FiraGO-Regular.otf',
};

// the upright android devices at the size the classic layout fits them to, 0.77 of the tile height
// at 0.75 of the width the Play phone runs off the top and the tablet leaves half the space
const ANDROID_SIZE = {
  'pixel-10-pro': { widthRatio: 0.643 },
  'pixel-tablet': { widthRatio: 0.667 },
};
// the tilt is a phone thing, tablets stand upright like Apple's iPad sets
const UPRIGHT = {
  'ipad-11': { widthRatio: 0.75, rotate: 0 },
  'pixel-tablet': { ...ANDROID_SIZE['pixel-tablet'], rotate: 0 },
};

export type Scene = {
  id: string;
  flow: string;
  // another flow per device
  flows?: Record<string, string>;
  appearance?: 'dark';
  // classic: copy on top and the device fit below it, tilt: copy on top and the device
  // running off the bottom, copy-below: the device from the top and the copy under it
  layout: 'classic' | 'tilt' | 'copy-below';
  headline: string;
  // over the layout's own placement, and per device in place of it
  device?: Partial<Placement>;
  placements?: Record<string, Partial<Placement>>;
};

// store order, the marble strip runs on from one screenshot into the next
export const SCENES: Scene[] = [
  {
    id: 'rates',
    flow: 'rates',
    layout: 'tilt',
    // the big phone leaning right
    device: { widthRatio: 0.94, x: 0.3, rotate: 15 },
    placements: {
      // the Duo keeps the iPhone's look, the top corner shows and the cards stay whole
      'iphone-duo-outer': { widthRatio: 0.85, x: 0.37, rotate: 15 },
      ...UPRIGHT,
    },
    headline: 'Cotizaciones del dólar en Argentina al instante',
  },
  {
    id: 'markets',
    flow: 'markets',
    flows: { 'ipad-11': 'markets-ipad' },
    layout: 'copy-below',
    device: { widthRatio: 0.75 },
    placements: ANDROID_SIZE,
    headline: 'Indicadores económicos al día',
  },
  {
    id: 'widgets',
    flow: 'widgets',
    flows: {
      'pixel-10-pro': 'widgets-android',
      'pixel-tablet': 'widgets-android',
    },
    // the widgets were placed by hand on the home screen, see docs/store-screenshots.md
    layout: 'classic',
    // the landscape iPad grid leaves the widgets small, the tablet grows and runs off the bottom
    placements: { 'ipad-11': { zoom: 2.2 } },
    headline: 'Widgets personalizables',
  },
  {
    id: 'dark',
    flow: 'rates',
    appearance: 'dark',
    layout: 'copy-below',
    // the first phone mirrored, hanging from the top
    device: { widthRatio: 0.94, x: 0.55, rotate: -15 },
    placements: {
      'iphone-duo-outer': { widthRatio: 0.85, x: 0.37, rotate: -15 },
      ...UPRIGHT,
    },
    headline: 'Apariencia de tema oscuro o claro',
  },
  {
    id: 'conversion',
    flow: 'conversion',
    flows: { 'ipad-11': 'conversion-ipad' },
    layout: 'classic',
    headline: 'Práctico conversor cambiario',
  },
  {
    id: 'detail',
    flow: 'detail',
    layout: 'copy-below',
    device: { widthRatio: 0.75 },
    placements: ANDROID_SIZE,
    headline: 'Gráficos históricos interactivos',
  },
  {
    id: 'notifications',
    flow: 'notifications',
    flows: { 'ipad-11': 'notifications-ipad' },
    layout: 'classic',
    headline: 'Notificaciones a medida',
  },
];
