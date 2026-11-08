// lays out the widgets of the iPad home screen 2 by 2, centered in landscape
// the iPad simulator does not drag widgets, place the four by hand first (indicators list, spread,
// rates list, rate), any order, on a page of their own, see docs/store-screenshots.md
// run as node packages/screenshots/ipad-widgets.ts <udid>
// plutil edits the binary plist in place
// its dates have no JSON form, only the keys that change go through JSON
import { execFileSync, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';

const udid = process.argv[2];
if (!udid) {
  console.error('run as node packages/screenshots/ipad-widgets.ts <udid>');
  process.exit(1);
}
const path = `${homedir()}/Library/Developer/CoreSimulator/Devices/${udid}/data/Library/SpringBoard/IconState.plist`;
// reading order, newest widget first, the indicator stays out like on the Play phone
const ORDER = [
  'ListMarketsWidget',
  'SpreadWidget',
  'ListRatesWidget',
  'RateWidget',
];
// landscape rows hold 6 small widget slots, 2 and 3 are the centered pair
const SLOTS = [2, 3, 8, 9];

const plutil = (...args: string[]) =>
  execFileSync('plutil', args, { encoding: 'utf8' });
const read = (key: string) =>
  JSON.parse(plutil('-extract', key, 'json', '-o', '-', path));
const write = (key: string, value: unknown) =>
  plutil('-replace', key, '-json', JSON.stringify(value), path);

// already shut down is fine
spawnSync('xcrun', ['simctl', 'shutdown', udid]);
const lists: any[][] = read('iconLists');
const index = lists.findIndex((p) =>
  p.some((e) => ORDER.includes(e?.widgetIdentifier)),
);
const widgets = Object.fromEntries(
  (lists[index] ?? [])
    .filter((e) => e?.widgetIdentifier)
    .map((e) => [e.widgetIdentifier, e]),
);
const missing = ORDER.filter((w) => !widgets[w]);
if (missing.length) {
  console.error(`place these widgets first: ${missing.join(', ')}`);
  process.exit(1);
}
const page = ORDER.map((w) => widgets[w]);
const meta = `listMetadata.${read('listUniqueIdentifiers')[index]}`;
// the metadata first, a page without its entry fails before anything changed
write(
  `${meta}.rotatedOrder`,
  page.map((e) => e.displayIdentifier),
);
write(
  `${meta}.rotatedFixedLocations`,
  Object.fromEntries(page.map((e, i) => [e.displayIdentifier, SLOTS[i]])),
);
// a replace on an array index inserts, the whole list goes back instead
lists[index] = page;
write('iconLists', lists);
execFileSync('xcrun', ['simctl', 'boot', udid], { stdio: 'inherit' });
console.log(`page ${index + 1}: ${ORDER.join(', ')}`);
