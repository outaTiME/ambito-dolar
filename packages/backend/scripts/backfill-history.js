// loads history for a type from a json grid and drops the history of a replaced or retired type
// run from the repo root on a weekend after deploying, see packages/backend/docs/backfill-history.md
//   node packages/backend/scripts/backfill-history.js [--rows type=file.json] [--drop type] [--apply]
// a grid is [[YYYY-MM-DD, value], ...] oldest first, a value a number or a [buy, sell] pair
// without --apply it only builds and checks, with it each upload asks first and is verified after
import AmbitoDolar from '@ambito-dolar/core';
import _ from 'lodash';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { parseArgs, parseEnv } from 'node:util';

import Shared, { MAX_NUMBER_OF_STATS } from '../src/libs/shared.js';

const { values: args } = parseArgs({
  options: {
    rows: { type: 'string', multiple: true, default: [] },
    drop: { type: 'string', multiple: true, default: [] },
    apply: { type: 'boolean', default: false },
    out: {
      type: 'string',
      default: path.join(
        os.homedir(),
        'Desktop',
        `ad-backfill-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
      ),
    },
  },
});
const ROWS = Object.fromEntries(args.rows.map((arg) => arg.split('=')));
const TYPES = Object.keys(ROWS);
const DROP = args.drop;

const fail = (msg) => {
  console.error(`\nABORT: ${msg}`);
  process.exit(1);
};
const check = (ok, msg) => ok || fail(msg);
const day = (ts) => AmbitoDolar.getTimezoneDate(ts).format('YYYY-MM-DD');
const ask = async (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(`${question} [type "yes"] `);
  rl.close();
  return answer.trim().toLowerCase() === 'yes';
};

check(TYPES.length || DROP.length, 'nothing to do, pass --rows and/or --drop');

// the backend env plus the urls the client reads, nothing hardcoded
const env = parseEnv(fs.readFileSync('.env', 'utf8'));
const client_env = parseEnv(fs.readFileSync('packages/client/.env', 'utf8'));
// the processor reads the two source urls for the --drop seed
for (const name of [
  'QUOTES_OBJECT_KEY',
  'SECRET_KEY',
  ...(DROP.length ? ['MARKETS_URL', 'BCRA_URL'] : []),
]) {
  check(env[name], `${name} missing in .env`);
}
for (const name of ['API_URL', 'HISTORICAL_RATES_URI']) {
  check(client_env[name], `${name} missing in packages/client/.env`);
}
// the public bucket the client reads the history from, every read and verify goes there
const BUCKET_URL = new URL('.', client_env.HISTORICAL_RATES_URI).href.replace(
  /\/$/,
  '',
);
const API_URL = new URL(client_env.API_URL).origin;
check(
  API_URL.startsWith('https://'),
  'API_URL must be https, the secret travels in a header',
);
const QUOTES_KEY = `${env.QUOTES_OBJECT_KEY}.json`;
const FULL_KEY = `full-historical-${env.QUOTES_OBJECT_KEY}.json`;

async function getJson(url) {
  // a cache buster so a verify never reads a stale copy
  const res = await fetch(`${url}?t=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache' },
  });
  check(res.ok, `${res.status} ${url}`);
  return res.json();
}

fs.mkdirSync(args.out, { recursive: true });
const save = (name, json) =>
  fs.writeFileSync(path.join(args.out, name), JSON.stringify(json));

// [YYYY-MM-DD, value] into [timestamp, value, change] with the processor math
// the first row has no day before and gets the change a first tick gets, 0
// a bcra series is dated and shows the day only, the rest show the time, stamped at the 18:00 close
const toTimestamp = (type, date) =>
  `${date}T${type in Shared.BCRA_MARKET_IDS ? '00:00' : '18:00'}:00-03:00`;
const toStats = (type, rows) =>
  rows.map(([date, value], i) =>
    _.take(
      Shared.getNextRateStat(
        i && [toTimestamp(type, rows[i - 1][0]), rows[i - 1][1]],
        {
          rate_last: value,
          date: toTimestamp(type, date),
          getThreshold: () => 0,
        },
      ).stat,
      3,
    ),
  );

// 1. snapshot what production has now
console.log(`backups of this run: ${args.out}\n`);
const [full, quotes] = await Promise.all([
  getJson(`${BUCKET_URL}/${FULL_KEY}`),
  getJson(`${BUCKET_URL}/${QUOTES_KEY}`),
]);
save('backup-full-historical.json', full);
save('backup-quotes.json', quotes);
for (const type of DROP) {
  // a rerun after a cancel finds it gone from the history and still in quotes
  check(
    type in full || type in quotes.rates || type in quotes.markets,
    `${type}: not in the history nor in quotes`,
  );
}

// 2. build the new history
const next_full = _.omit(full, DROP);
const report = [];
for (const type of TYPES) {
  const rows = JSON.parse(fs.readFileSync(ROWS[type], 'utf8'));
  check(rows.length > 0, `${type}: the grid is empty`);
  for (const [date, value] of rows) {
    check(
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        (Number.isFinite(value) ||
          (value?.length === 2 && value.every(Number.isFinite))),
      `${type}: bad row ${JSON.stringify([date, value])}`,
    );
  }
  // a dropped type is rebuilt whole from its grid
  const existing = DROP.includes(type) ? [] : full[type] || [];
  const first = existing[0]?.[0];
  // the processor rows win, the grid only adds the days before them
  const added = toStats(type, rows).filter(
    ([ts]) => !first || AmbitoDolar.getTimezoneDate(ts).isBefore(first, 'day'),
  );
  next_full[type] = added.concat(existing);
  check(next_full[type].length > 0, `${type}: no row before the stored ones`);
  report.push({
    tipo: type,
    antes: existing.length,
    agregadas: added.length,
    despues: next_full[type].length,
    desde: day(next_full[type][0][0]),
    hasta: day(_.last(next_full[type])[0]),
  });
}

// 3. checks, any failure aborts before uploading anything
check(
  !('rates' in next_full) && !('markets' in next_full),
  'the body would take the merge path, not the overwrite',
);
check(
  _.isEqual(
    _.sortBy(Object.keys(next_full)),
    _.sortBy(_.union(_.difference(Object.keys(full), DROP), TYPES)),
  ),
  'the type list changed beyond --rows and --drop',
);
for (const type of Object.keys(next_full)) {
  const stats = next_full[type];
  const existing = DROP.includes(type) ? [] : full[type] || [];
  if (!TYPES.includes(type)) {
    check(_.isEqual(existing, stats), `${type}: changed without being asked`);
    continue;
  }
  // the stored rows are the untouched tail
  check(
    _.isEqual(_.takeRight(stats, existing.length), existing),
    `${type}: the stored rows changed`,
  );
  // one row per day in order, a repeated day fails it too
  for (let i = 1; i < stats.length; i++) {
    check(
      AmbitoDolar.getTimezoneDate(stats[i - 1][0]).isBefore(stats[i][0], 'day'),
      `${type}: repeated or out of order at ${stats[i][0]}`,
    );
  }
}
save('new-full-historical.json', next_full);

// 4. quotes.json, a dropped market the processor still serves restarts with the week it would hold
// a retired type has no latest value and only goes away, the max of a loaded type follows its grid
let seeds = {};
if (DROP.length) {
  Object.assign(process.env, _.pick(env, ['MARKETS_URL', 'BCRA_URL']));
  const { getMarkets, getNewRates } =
    await import('../src/subscribers/process.js');
  seeds = _.mapValues(
    _.pick(await getMarkets(), DROP),
    ([identity, value, date], type) => {
      // a listed market carries no date, its identity is the day of the value as D/M/YYYY
      const at =
        date ??
        toTimestamp(
          type,
          identity
            .split('/')
            .reverse()
            .map((part) => part.padStart(2, '0'))
            .join('-'),
        );
      // the change against the day before when a grid gave one, as the next tick would
      const prev = _.findLast(next_full[type] ?? [], ([ts]) =>
        AmbitoDolar.getTimezoneDate(ts).isBefore(at, 'day'),
      );
      return getNewRates(prev ? { [type]: prev } : {}, {
        [type]: [identity, value, at],
      })[type];
    },
  );
}
const transformQuotes = (base) => {
  const next = _.cloneDeep(base);
  const maxes = [];
  for (const group of ['rates', 'markets']) {
    for (const type of DROP) {
      delete next[group]?.[type];
    }
  }
  // the shape addStats, the provider and getHistoricalRate leave, the week before it from a grid
  // the detail draws its week and offers the ranges from these stats, one alone shows neither
  for (const [type, stat] of Object.entries(seeds)) {
    next.markets[type] = {
      stats: Shared.addStat(next_full[type], stat, MAX_NUMBER_OF_STATS),
      provider: Shared.getDataProviderForMarket(type),
      max: AmbitoDolar.getRateValue(stat),
      max_date: stat[0],
    };
  }
  for (const group of ['rates', 'markets']) {
    for (const type of TYPES) {
      const item = next[group]?.[type];
      if (!item) {
        continue;
      }
      const top = _.maxBy(next_full[type], (stat) =>
        AmbitoDolar.getRateValue(stat),
      );
      const top_value = AmbitoDolar.getRateValue(top);
      if (item.max === undefined || top_value > item.max) {
        maxes.push({
          tipo: type,
          antes: `${item.max} (${item.max_date && day(item.max_date)})`,
          despues: `${top_value} (${day(top[0])})`,
        });
        item.max = top_value;
        item.max_date = top[0];
      }
    }
  }
  check(
    _.isEqual(
      _.omit(next, ['rates', 'markets']),
      _.omit(base, ['rates', 'markets']),
    ),
    'quotes: a field outside rates and markets changed',
  );
  for (const group of ['rates', 'markets']) {
    for (const type of Object.keys(base[group] || {})) {
      if (!DROP.includes(type)) {
        check(
          _.isEqual(next[group][type].stats, base[group][type].stats),
          `quotes: ${type} stats changed`,
        );
      }
    }
  }
  return { next, maxes };
};
const { next: next_quotes, maxes } = transformQuotes(quotes);
save('new-quotes.json', next_quotes);

if (report.length) {
  console.log('History (full-historical):');
  console.table(report);
}
for (const type of TYPES) {
  // a dropped type is rebuilt whole, every row is new
  const added =
    next_full[type].length -
    (DROP.includes(type) ? 0 : (full[type] || []).length);
  if (added > 0) {
    console.log(
      `${type.padEnd(21)} first added ${JSON.stringify(next_full[type][0])}  last added ${JSON.stringify(next_full[type][added - 1])}  first stored ${JSON.stringify(next_full[type][added] ?? null)}`,
    );
  }
}
for (const type of DROP) {
  console.log(
    `${type}: dropped from the history (${(full[type] || []).length} rows), quotes.json ${seeds[type] ? `starts at ${JSON.stringify(seeds[type])}` : 'loses it until a tick brings it back'}`,
  );
}
if (maxes.length) {
  console.log('\nMaximums in quotes.json:');
  console.table(maxes);
}
console.log('Every other type stays identical (checked).');

if (!args.apply) {
  console.log('\nDry run, nothing uploaded. Run again with --apply to upload');
  process.exit(0);
}
// a processor tick landing between the re-read and the post is lost, it runs on weekdays
const now = AmbitoDolar.getTimezoneDate();
check(
  [0, 6].includes(now.day()) || now.hour() < 9 || now.hour() >= 19,
  'the processor runs on weekdays, upload on a weekend or before 9 or after 19',
);

// 5. the history, the route replaces it whole and derives the year and the legacy files from it
const post = async (route, json, on_fail) => {
  let res, text;
  try {
    res = await fetch(`${API_URL}/${route}`, {
      method: 'POST',
      // a redirect never carries the secret anywhere
      redirect: 'error',
      headers: {
        authorization: env.SECRET_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(json),
    });
    text = await res.text();
  } catch (error) {
    // the request may still have landed, read the bucket before restoring
    fail(`${route} ${error.message}\n${on_fail}`);
  }
  check(res.ok, `${route} ${res.status} ${text}\n${on_fail}`);
  console.log(`${route}: ${text}`);
};
const restore = (route, file) =>
  `restaurar: curl -X POST -H "authorization: $SECRET_KEY" -H "content-type: application/json" --data-binary @${path.join(args.out, file)} ${API_URL}/${route}`;
if (!(await ask('\nUpload the new history to /update-historical-rates?'))) {
  fail('cancelled, nothing uploaded');
}
// a processor write since the snapshot would be lost by the overwrite
const [now_full, now_quotes] = await Promise.all([
  getJson(`${BUCKET_URL}/${FULL_KEY}`),
  getJson(`${BUCKET_URL}/${QUOTES_KEY}`),
]);
check(
  _.isEqual(now_full, full) && _.isEqual(now_quotes, quotes),
  'production changed since the snapshot, run again',
);
await post(
  'update-historical-rates',
  next_full,
  restore('update-historical-rates', 'backup-full-historical.json'),
);
check(
  _.isEqual(await getJson(`${BUCKET_URL}/${FULL_KEY}`), next_full),
  `the stored history differs from what was sent\n${restore('update-historical-rates', 'backup-full-historical.json')}`,
);
console.log(`History checked: ${FULL_KEY} matches what was sent.`);

// 6. quotes.json through /update-rates so the clients hear of it, built again from a fresh read
const fresh = await getJson(`${BUCKET_URL}/${QUOTES_KEY}`);
check(
  fresh.processed_at === quotes.processed_at,
  `${QUOTES_KEY} changed since the snapshot (${quotes.processed_at} -> ${fresh.processed_at}), run again`,
);
const { next: final_quotes } = transformQuotes(fresh);
if (_.isEqual(final_quotes, fresh)) {
  console.log(`${QUOTES_KEY} no cambia. Listo.`);
  process.exit(0);
}
// the route merges each type of the body into the history, the same rows the processor wrote
const expected_full = { ...next_full };
for (const group of ['rates', 'markets']) {
  for (const [type, { stats }] of Object.entries(final_quotes[group] || {})) {
    expected_full[type] = Shared.mergeHistoricalStats(
      expected_full[type],
      stats,
    );
  }
}
const touched = Object.keys(expected_full).filter(
  (type) => !_.isEqual(expected_full[type], next_full[type]),
);
const [added_types, rewritten] = _.partition(
  touched,
  (type) => !next_full[type],
);
if (added_types.length) {
  console.log(`/update-rates adds to the history: ${added_types.join(', ')}`);
}
if (rewritten.length) {
  console.log(
    `/update-rates rewrites the history tail of: ${rewritten.join(', ')}`,
  );
}
if (!(await ask(`Upload ${QUOTES_KEY} to /update-rates?`))) {
  fail(
    `cancelled, the history is up and ${QUOTES_KEY} is not, the next tick merges the old ${DROP.join(', ')} back into the history\nfinish with --apply or ${restore('update-historical-rates', 'backup-full-historical.json')}`,
  );
}
// a quotes restore merges its rows into the history, the history restore goes after it
const restore_quotes = `${restore('update-rates', 'backup-quotes.json')}\n${restore('update-historical-rates', 'backup-full-historical.json')}`;
// the route may fail after writing, the restore covers both files
await post('update-rates', final_quotes, restore_quotes);
// the route stamps updated_at and keeps the stored is_open
check(
  _.isEqual(
    _.omit(await getJson(`${BUCKET_URL}/${QUOTES_KEY}`), ['updated_at']),
    _.omit(final_quotes, ['updated_at']),
  ),
  `the stored ${QUOTES_KEY} differs\n${restore_quotes}`,
);
check(
  _.isEqual(await getJson(`${BUCKET_URL}/${FULL_KEY}`), expected_full),
  `the history after /update-rates differs\n${restore_quotes}`,
);
console.log(`${QUOTES_KEY} and the history checked, done.`);
