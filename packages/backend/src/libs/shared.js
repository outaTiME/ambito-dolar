import AmbitoDolar from '@ambito-dolar/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
// import { StandardRetryStrategy } from '@aws-sdk/util-retry';
import { init, tx } from '@instantdb/admin';
import * as Sentry from '@sentry/aws-serverless';
import { parallelScan } from '@shelf/dynamodb-parallel-scan';
import { NodeHttpHandler } from '@smithy/node-http-handler';
// eslint-disable-next-line import/namespace -- expo-server-sdk v7 ships json import attributes universe parser cannot read
import { Expo } from 'expo-server-sdk';
import { JWT } from 'google-auth-library';
import https from 'https';
import _ from 'lodash';
import pLimit from 'promise-limit';
import semverLt from 'semver/functions/lt.js';
import { Resource } from 'sst';
import yn from 'yn';
import zlib from 'zlib';

import { publish as publishToInstagram } from './social/instagram.js';
import { publish as publishToMastodon } from './social/mastodon.js';

// defaults

const MAX_SOCKETS = 250;

const ddbClient = new DynamoDBClient({
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_util_retry.html#maxattempts
  // retryStrategy: new StandardRetryStrategy(5),
  requestHandler: new NodeHttpHandler({
    httpsAgent: new https.Agent({
      // prevent warnings on parallelScan (half of the concurrency value)
      maxSockets: MAX_SOCKETS,
      // keepAlive: false,
    }),
    // connectionTimeout: 1000,
    // socketTimeout: 2000,
  }),
});

const s3Client = new S3Client({
  // pass
});

const snsClient = new SNSClient({
  // pass
});

// constants

export const MIN_CLIENT_VERSION_FOR_MEP = '2.0.0';
export const MIN_CLIENT_VERSION_FOR_WHOLESALE = '5.0.0';
export const MIN_CLIENT_VERSION_FOR_CCB = '6.0.0';
export const MIN_CLIENT_VERSION_FOR_SAVING = '6.1.0';
export const MIN_CLIENT_VERSION_FOR_QATAR = '6.4.0';
export const MIN_CLIENT_VERSION_FOR_BNA = '6.11.0';
export const MIN_CLIENT_VERSION_FOR_EURO_AND_REAL = '10.1.0';
export const MIN_CLIENT_VERSION_FOR_FUTURE = '13.2.0';
export const MAX_NUMBER_OF_STATS = 6; // 1 week, same as the client
export const IS_LOCAL = process.env.IS_LOCAL === 'true';
export const IS_PRODUCTION = process.env.IS_PRODUCTION === 'true';
// rates the clients older than quotes.json render, a new one never reaches them
const LEGACY_RATE_TYPES = [
  AmbitoDolar.OFFICIAL_TYPE,
  AmbitoDolar.TOURIST_TYPE,
  AmbitoDolar.INFORMAL_TYPE,
  AmbitoDolar.CCL_TYPE,
  AmbitoDolar.MEP_TYPE,
];
// v5 files add wholesale and keep the ccl key
const V5_RATE_TYPES = [...LEGACY_RATE_TYPES, AmbitoDolar.WHOLESALE_TYPE];

// keeps the source key order, legacy files rename ccl to cl
const pickRates = (rates, types, legacy = false) =>
  _.mapKeys(
    _.pickBy(rates, (rate, type) => types.includes(type)),
    (rate, type) =>
      legacy && type === AmbitoDolar.CCL_TYPE
        ? AmbitoDolar.CCL_LEGACY_TYPE
        : type,
  );
// prevents 403 errors when fetching rates
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
// 2.1.x
const RATE_STATS_OBJECT_KEY = process.env.RATE_STATS_OBJECT_KEY;
// 3.x
const RATES_LEGACY_OBJECT_KEY = process.env.RATES_LEGACY_OBJECT_KEY;
const HISTORICAL_RATES_LEGACY_OBJECT_KEY =
  'historical-' + RATES_LEGACY_OBJECT_KEY;
// 5.x
const RATES_OBJECT_KEY = process.env.RATES_OBJECT_KEY;
const HISTORICAL_RATES_OBJECT_KEY = 'historical-' + RATES_OBJECT_KEY;
// 6.x
const QUOTES_OBJECT_KEY = process.env.QUOTES_OBJECT_KEY;
const FETCH_OBJECT_KEY = process.env.FETCH_OBJECT_KEY;
const HISTORICAL_QUOTES_OBJECT_KEY = 'historical-' + QUOTES_OBJECT_KEY;
const FULL_HISTORICAL_QUOTES_OBJECT_KEY =
  'full-historical-' + QUOTES_OBJECT_KEY;

const getFirebaseAccessToken = () => {
  // https://firebase.google.com/docs/database/rest/auth#authenticate_with_an_access_token
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/firebase.database',
  ];
  return new Promise((resolve, reject) => {
    const jwtClient = new JWT({
      email: process.env.FIREBASE_CLIENT_EMAIL,
      key: process.env.FIREBASE_PRIVATE_KEY,
      scopes,
    });
    jwtClient.authorize((err, token) => {
      if (err) {
        reject(err);
        return;
      }
      // internal
      resolve(token.access_token);
    });
  });
};

const fetchFirebaseData = async (uri, opts) => {
  const access_token = await getFirebaseAccessToken();
  const url = new URL(`${process.env.FIREBASE_DATABASE_URL}/${uri}`);
  url.pathname = url.pathname + '.json';
  url.searchParams.set('access_token', access_token);
  return AmbitoDolar.fetch(url.href, opts).json();
};

// remove data from payload
const updateFirebaseData = (uri, { data, ...payload } = {}) =>
  fetchFirebaseData(uri, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.warn(
      'Unable to update firebase',
      JSON.stringify({ uri, payload, error: error.message }),
    );
    // ignore
  });

const updateInstantData = ({ data } = {}) => {
  if (data) {
    const db = init({
      appId: process.env.INSTANT_APP_ID,
      adminToken: process.env.INSTANT_ADMIN_TOKEN,
    });
    return db
      .query({
        boards: {
          $: {
            // avoid fixed record identifier
            limit: 1,
          },
        },
      })
      .then((res) => {
        const boardId = res.boards?.[0]?.id;
        if (boardId) {
          // the boards feed releases that never read markets
          const payload = {
            data: _.omit(data, ['markets']),
            updated_at: data?.updated_at,
          };
          return db.transact([tx.boards[boardId].update(payload)]).then(() => {
            console.info(
              'Board updated on instant',
              JSON.stringify({ boardId }),
            );
          });
        } else {
          // ignore when no board available
          console.warn('No board found on instant', JSON.stringify(res));
        }
      })
      .catch((error) => {
        console.warn(
          'Unable to update board on instant',
          JSON.stringify({ error: error.message }),
        );
        // ignore
      });
  }
  // ignore when there are no updates
  // console.warn('No data to update board on instant');
};

const updateRealtimeData = (payload) => {
  if (IS_LOCAL) {
    console.info('Realtime updates are disabled on local mode');
    return Promise.resolve({
      skipped: true,
      reason: 'IS_LOCAL',
    });
  }
  return Promise.all([
    updateFirebaseData('', payload),
    updateInstantData(payload),
  ]);
};

const serviceResponse = (res, code, json) => {
  if (res) {
    return res.status(code).json(json);
  }
  return {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(json),
    statusCode: code,
  };
};

const getDynamoDBClient = () => ddbClient;

const getS3Client = () => s3Client;

/* const getAllDataFromDynamoDB = async (params, allData = []) => {
  const command = new ScanCommand(params);
  const data = await ddbClient.send(command);
  return data.LastEvaluatedKey
    ? getAllDataFromDynamoDB(
        { ...params, ExclusiveStartKey: data.LastEvaluatedKey },
        [...allData, ...data['Items']]
      )
    : [...allData, ...data['Items']];
}; */

const getAllDataFromDynamoDB = (params) => {
  const client = getDynamoDBClient();
  return parallelScan(params, {
    // up to 1 MB of data per thread
    concurrency: 500,
    client,
  });
};

const isSemverLt = (v1, v2) => semverLt(v1, v2);

const getVariationThreshold = (type, prev_rate, rate) => {
  const realtime_types = [
    AmbitoDolar.CCL_TYPE,
    AmbitoDolar.MEP_TYPE,
    AmbitoDolar.CCB_TYPE,
    AmbitoDolar.FUTURE_TYPE,
  ];
  if (realtime_types.includes(type)) {
    // flexible variation of 1% between notifications
    return ((prev_rate + rate) / 2) * 0.01;
  }
  // many small intraday ticks, 0.5% filters noise without losing trends
  if (type === AmbitoDolar.WHOLESALE_TYPE) {
    return ((prev_rate + rate) / 2) * 0.005;
  }
  return 0.05;
};

// https://transang.me/modern-fetch-and-how-to-get-buffer-output-from-aws-sdk-v3-getobjectcommand/
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

// Create a helper function to convert a ReadableStream to a string.
/* const streamToString = (stream) =>
new Promise((resolve, reject) => {
  const chunks = [];
  stream.on('data', (chunk) => chunks.push(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
}); */

// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-example-creating-buckets.html#s3-example-creating-buckets-get-object
const getJsonObject = (key) => {
  const bucket = Resource.Bucket.name;
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: `${key}.json`,
  });
  return client.send(command).then(async (data) => {
    const bodyContents = await streamToBuffer(data.Body);
    const uncompressed = zlib.gunzipSync(bodyContents);
    return JSON.parse(uncompressed);
  });
};

const getTickets = (date, type) =>
  getJsonObject(`notifications/${date}-${type}`);

const getRatesJsonObject = () => getJsonObject(QUOTES_OBJECT_KEY);

// the last stat per type, what /fetch serves from S3 and from its lambda
const getLastStats = (items) =>
  _.mapValues(items, (item) => _.last(item.stats));

// an unreadable quotes file throws, so a manual notify fails loud and its event retries
// a plain error keeps a string code like Z_DATA_ERROR out of the route status
const getRates = async (base_rates) =>
  getLastStats(
    (
      base_rates ||
      (await getRatesJsonObject().catch((error) => {
        throw new Error('Unable to read the rates', { cause: error });
      }))
    ).rates,
  );

const storeObject = (key, content, compressed = true, opts = {}) => {
  const bucket = Resource.Bucket.name;
  const client = getS3Client();
  const buffer = new Buffer.from(content);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: compressed ? zlib.gzipSync(buffer) : buffer,
    ...opts,
  });
  return client.send(command).then((result) => ({
    key,
    url: `https://${bucket}.s3.amazonaws.com/${key}`,
    result,
  }));
};

const storeJsonObject = (key, json, opts = {}) => {
  const { suffix = '.json', ...storeOpts } = opts;
  return storeObject(`${key}${suffix}`, JSON.stringify(json), true, {
    ContentType: 'application/json; charset=utf-8',
    CacheControl: 'no-cache',
    // brotli-compressed
    // ContentEncoding: 'br',
    ContentEncoding: 'gzip',
    ...storeOpts,
  });
};

const storeTickets = (date, type, json) =>
  storeJsonObject(`notifications/${date}-${type}`, json);

const storePublicJsonObject = (key, json) => storeJsonObject(key, json);

const storeFetchJsonObject = (rates) => {
  const json = getLastStats(rates.rates);
  const opts = { suffix: '' };
  return Promise.all([
    storeJsonObject(FETCH_OBJECT_KEY, json, opts),
    // keep a prefixed key to serve GET /api/fetch from legacy api cdn
    storeJsonObject(`api/${FETCH_OBJECT_KEY}`, json, opts),
  ]);
};

const storeRateStats = (rates) => {
  const base_rates = Object.entries(
    pickRates(rates, LEGACY_RATE_TYPES, true),
  ).reduce((obj, [type, { stats }]) => {
    // convert number to formatted values
    const new_stats = stats.map((stat) => {
      const timestamp = stat[0];
      const value = stat[1];
      const change = stat[2];
      return {
        timestamp,
        ...(Array.isArray(value)
          ? {
              buy: AmbitoDolar.formatRateCurrency(value[0]),
              sell: AmbitoDolar.formatRateCurrency(value[1]),
            }
          : { value: AmbitoDolar.formatRateCurrency(value) }),
        change: AmbitoDolar.formatRateChange(change),
      };
    });
    // translate to production keys
    obj[type + '_stats'] = new_stats;
    return obj;
  }, {});
  return storePublicJsonObject(RATE_STATS_OBJECT_KEY, base_rates);
};

const storeHistoricalRatesJsonObject = async (rates) => {
  let base_rates = rates;
  // when rates comes from storeRatesJsonObject, a first run may carry markets only
  if (rates?.rates || rates?.markets) {
    // merge
    base_rates = await getJsonObject(FULL_HISTORICAL_QUOTES_OBJECT_KEY).catch(
      (error) => {
        if (error.name === 'NoSuchKey') {
          return {};
        }
        // unhandled error
        throw error;
      },
    );
    Object.entries({
      ..._.mapValues(rates.markets, 'stats'),
      // a rate always wins a collision
      ..._.mapValues(rates.rates, 'stats'),
    }).forEach(([type, stats]) => {
      base_rates[type] = mergeHistoricalStats(base_rates[type], stats);
    });
  }
  // the year the client draws as its widest range
  const base_year_rates = _.mapValues(base_rates || {}, (stats) =>
    AmbitoDolar.getStatsInRange(stats, (to) => to.clone().subtract(1, 'year')),
  );
  const legacy_rates = pickRates(base_year_rates, LEGACY_RATE_TYPES, true);
  return Promise.all([
    storePublicJsonObject(FULL_HISTORICAL_QUOTES_OBJECT_KEY, base_rates),
    storePublicJsonObject(HISTORICAL_RATES_LEGACY_OBJECT_KEY, legacy_rates),
    storePublicJsonObject(
      HISTORICAL_RATES_OBJECT_KEY,
      pickRates(base_year_rates, V5_RATE_TYPES),
    ),
    storePublicJsonObject(HISTORICAL_QUOTES_OBJECT_KEY, base_year_rates),
  ]);
};

const storeRatesJsonObject = (quotes, is_updated) => {
  // markets only travel on quotes
  const rates = _.omit(quotes, ['markets']);
  const legacy_rates = pickRates(rates.rates, LEGACY_RATE_TYPES, true);
  return Promise.all([
    is_updated && storeRateStats(rates.rates),
    storePublicJsonObject(RATES_LEGACY_OBJECT_KEY, {
      ...rates,
      rates: legacy_rates,
    }),
    storePublicJsonObject(RATES_OBJECT_KEY, {
      ...rates,
      rates: pickRates(rates.rates, V5_RATE_TYPES),
    }),
    storePublicJsonObject(QUOTES_OBJECT_KEY, quotes),
    // keep a non-suffixed key to serve GET /fetch from cloudfront+s3
    is_updated && storeFetchJsonObject(rates),
    // save historical rates
    is_updated && storeHistoricalRatesJsonObject(quotes),
  ]);
};

const getDataProviderForRate = (type) => {
  /* if (
    // type === AmbitoDolar.CCL_TYPE ||
    // type === AmbitoDolar.MEP_TYPE ||
    type === AmbitoDolar.CCB_TYPE
  ) {
    return 'CriptoYa';
  } */
  return 'Ámbito Financiero';
};

const getDataProviderForMarket = (type) => {
  if (
    type === AmbitoDolar.INFLATION_TYPE ||
    type === AmbitoDolar.INFLATION_ANNUAL_TYPE ||
    type === AmbitoDolar.TERM_DEPOSIT_TYPE ||
    type === AmbitoDolar.UVA_TYPE ||
    type === AmbitoDolar.RESERVES_TYPE
  ) {
    return 'BCRA';
  }
  return getDataProviderForRate(type);
};

const getPathForRate = (type) => {
  if (type === AmbitoDolar.TOURIST_TYPE) {
    return 'dolarturista';
  } else if (type === AmbitoDolar.SAVING_TYPE) {
    return 'dolarahorro';
  } else if (type === AmbitoDolar.CCL_TYPE) {
    return 'dolarrava/cl';
  } else if (type === AmbitoDolar.MEP_TYPE) {
    return 'dolarrava/mep';
  } else if (type === AmbitoDolar.CCB_TYPE) {
    return 'dolarcripto';
  } else if (type === AmbitoDolar.QATAR_TYPE) {
    return 'dolarqatar';
  } else if (type === AmbitoDolar.LUXURY_TYPE) {
    return 'dolardelujo';
  } else if (type === AmbitoDolar.CULTURAL_TYPE) {
    return 'dolarcoldplay';
  } else if (type === AmbitoDolar.BNA_TYPE) {
    return 'dolarnacion';
  } else if (type === AmbitoDolar.EURO_TYPE) {
    return 'euro';
  } else if (type === AmbitoDolar.EURO_INFORMAL_TYPE) {
    return 'euro/informal';
  } else if (type === AmbitoDolar.REAL_TYPE) {
    return 'real';
  } else if (type === AmbitoDolar.FUTURE_TYPE) {
    return 'dolarfuturo';
  }
  return `dolar/${type}`;
};

const getRateUrl = (type) => {
  const path = getPathForRate(type);
  return _.template(process.env.RATE_URL)({
    path,
  });
};

const getCryptoRatesUrl = () => process.env.CRYPTO_RATES_URL;

const getSocialScreenshotUrl = (data) => {
  const url = new URL(process.env.SOCIAL_SCREENSHOT_URL);
  url.search = new URLSearchParams({
    ...Object.fromEntries(url.searchParams),
    ...data,
  });
  return url.toString();
};

const getExpoClient = () =>
  new Expo({
    // disable concurrency on sendPushNotificationsAsync to handle it manually
    // https://github.com/featurist/promise-limit?tab=readme-ov-file#api
    maxConcurrentRequests: 0,
  });

// SNS

const publishMessageToTopic = (event, payload = {}) => {
  const start_time = Date.now();
  console.info(
    'Publising message to sns topic',
    JSON.stringify({
      event,
      payload,
    }),
  );
  const command = new PublishCommand({
    Message: JSON.stringify(payload),
    MessageStructure: 'string',
    // https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
    MessageAttributes: {
      event: {
        DataType: 'String',
        StringValue: event,
      },
    },
    TopicArn: Resource.Topic.arn,
  });
  return snsClient
    .send(command)
    .then(({ MessageId: id }) => {
      const duration = AmbitoDolar.formatDuration(Date.now() - start_time);
      console.info(
        'Message published to sns topic',
        JSON.stringify({
          id,
          event,
          duration,
        }),
      );
      return id;
    })
    .catch((error) => {
      console.warn(
        'Unable to publish message to sns topic',
        JSON.stringify({ event, error: error.message }),
      );
    });
};

const triggerProcessEvent = (payload) =>
  publishMessageToTopic('process', payload);

const triggerInvalidateReceiptsEvent = (payload) =>
  publishMessageToTopic('invalidate-receipts', payload);

const triggerNotifyEvent = (payload) =>
  publishMessageToTopic('notify', payload);

const triggerSocialNotifyEvent = (payload) =>
  publishMessageToTopic('social-notify', payload);

const triggerFundingNotifyEvent = (payload) =>
  publishMessageToTopic('funding-notify', payload);

// IFTTT

const triggerEvent = (event, payload) =>
  AmbitoDolar.fetch(
    `https://maker.ifttt.com/trigger/${event}/with/key/${process.env.IFTTT_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    },
  ).then(() => {
    // const duration = AmbitoDolar.formatDuration(Date.now() - start_time);
    /* console.info(
        'Event triggered',
        JSON.stringify({
          event,
          duration,
        }),
      ); */
    return {
      event,
      // duration,
    };
  });

const triggerSendSocialNotificationsEvent = (caption, image_url) =>
  triggerEvent('ambito-dolar-social-notifications', {
    value1: caption,
    ...(image_url && { value2: image_url }),
  });

const promiseRetry = AmbitoDolar.promiseRetry;

const triggerSocials = (targets, caption, url, story_url, file, story_file) => {
  if (IS_LOCAL) {
    console.info('Social publishing is disabled on local mode');
    return Promise.resolve([
      {
        skipped: true,
        reason: 'IS_LOCAL',
      },
    ]);
  }
  const promises = _.chain(targets ?? ['ifttt', 'instagram', 'mastodon'])
    .map((target) => {
      let factory;
      switch (target) {
        case 'ifttt':
          factory = () => triggerSendSocialNotificationsEvent(caption, url);
          break;
        case 'instagram':
          if (url) {
            factory = () => publishToInstagram(url, caption, story_url);
          }
          break;
        case 'mastodon':
          factory = () => publishToMastodon(caption, file);
          break;
      }
      if (factory) {
        return [target, factory];
      }
      // invalid
    })
    // remove falsey
    .compact()
    .map(([target, factory]) => {
      const start_time = Date.now();
      return promiseRetry((retry, attempt) =>
        factory()
          .then((response) => {
            const duration = AmbitoDolar.formatDuration(
              Date.now() - start_time,
            );
            return {
              target,
              duration,
              response,
              attempt,
            };
          })
          .catch(retry),
      ).catch((error) => {
        // ignore when error
        console.warn(
          'Unable to trigger social',
          JSON.stringify({
            target,
            error: error.message,
          }),
        );
      });
    })
    .value();
  // remove errors
  return Promise.all(promises).then(_.compact);
};

const wrapHandler = (handler) => {
  if (IS_PRODUCTION) {
    // https://docs.sentry.io/platforms/javascript/guides/aws-lambda/install/esm-npm/#alternative-initialize-the-sdk-in-code
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      // disable performance monitoring
      // tracesSampleRate: 1.0,
      integrations: [
        Sentry.captureConsoleIntegration({
          levels: ['warn', 'error'],
        }),
      ],
    });
    return Sentry.wrapHandler(handler);
  }
  return handler;
};

const getActiveDevices = async () => {
  const items = await getAllDataFromDynamoDB({
    TableName: Resource.Devices.name,
    // TODO: invalidated field should be removed
    ProjectionExpression: 'push_token, invalidated',
  });
  return _.chain(items)
    .filter((item) => !item.invalidated)
    .map('push_token')
    .value();
};

const isTruthy = yn;

const isQueryParamTruthy = (value) =>
  isTruthy(value, {
    // truthy when value exists and is blank
    default: value === '',
  });

// the stat a fetched value turns into, the hash only rides along
// getThreshold gets the notified value and the new one
const getNextRateStat = (
  rate,
  { rate_last, date, rate_hash, getThreshold },
) => {
  // FIXME: use the average between the values instead of the highest one ???
  // eslint-disable-next-line no-sparse-arrays
  const rate_last_max = AmbitoDolar.getRateValue([, rate_last]);
  // processing time unless the source dates its value
  const rate_date = date ?? AmbitoDolar.getTimezoneDate().format();
  // get close rate when first rate of day (open)
  const rate_close = rate
    ? AmbitoDolar.getTimezoneDate(rate_date).isSame(rate[0], 'day')
      ? rate[3]
      : AmbitoDolar.getRateValue(rate)
    : rate_last_max;
  // calculate from open / close rate and truncate
  const rate_change_percent = rate_close
    ? AmbitoDolar.getNumber((rate_last_max / rate_close - 1) * 100)
    : 0;
  // handles variations between notifications regardless of the exchange rate day
  const prev = rate?.[4] ?? rate_last_max;
  // truncate decimals
  const diff = AmbitoDolar.getNumber(Math.abs(prev - rate_last_max));
  const threshold = getThreshold(prev, rate_last_max);
  const should_notify = diff !== 0 && diff > threshold;
  return {
    stat: [
      rate_date,
      rate_last,
      rate_change_percent,
      rate_close,
      should_notify ? rate_last_max : prev,
      rate_hash,
    ],
    variation: { prev, curr: rate_last_max, diff, threshold, should_notify },
  };
};

// a same day stat is replaced, older ones keep their first three fields to reduce the file size
const addStat = (stats, stat, max) => {
  const day = AmbitoDolar.getTimezoneDate(stat[0]);
  return _.takeRight(
    (stats || [])
      .filter((item) => !day.isSame(item[0], 'day'))
      .map((item) => _.take(item, 3))
      .concat([stat]),
    max,
  );
};

// the new stats replace every day from their first one on, without the open and the hash
const mergeHistoricalStats = (history, stats) => {
  const from = AmbitoDolar.getTimezoneDate(_.first(stats)[0]);
  return (history || [])
    .filter(([timestamp]) =>
      AmbitoDolar.getTimezoneDate(timestamp).isBefore(from, 'day'),
    )
    .concat(stats.map((stat) => _.take(stat, 3)));
};

const getChangeMessage = (rate) => {
  const value = AmbitoDolar.getRateValue(rate);
  const formatted_value = AmbitoDolar.formatRateCurrency(value, true);
  const change = rate[2];
  const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '';
  if (arrow) {
    const abs_pct = AmbitoDolar.formatRateCurrency(Math.abs(change), true);
    return `${formatted_value} ${arrow}${abs_pct}%`;
  }
  return formatted_value;
};

const getRateMessage = (type, rate) => {
  const rate_title = AmbitoDolar.getRateTitle(type);
  if (rate_title) {
    return `${rate_title.toUpperCase()} ${getChangeMessage(rate)}`;
  }
};

// the push body and the social caption, reddit and bluesky cap the caption at 300 characters
const getBodyMessage = (rates) => {
  const available_rates = AmbitoDolar.getAvailableRates(rates);
  if (available_rates) {
    const body = _.chain(available_rates)
      .map((rate, type) => ({ type, rate, mag: Math.abs(rate[2] ?? 0) }))
      .sortBy((x) => -x.mag)
      .map(({ type, rate }) => getRateMessage(type, rate))
      // remove empty messages
      .compact()
      .value();
    if (body.length > 0) {
      return body.join(', ');
    }
  }
};

const getSocialCaption = (type, rates) => {
  const body = getBodyMessage(rates);
  if (body) {
    const title = AmbitoDolar.getNotificationTitle(type);
    return `${title}. ${body}`;
  }
};

// which pushes a run sends, a variation is a notified value that moved in getNextRateStat
const getNotifications = ({
  close_day,
  rates,
  new_rates,
  has_rates_from_today,
}) => {
  const all_rates = { ...rates, ...new_rates };
  if (close_day === true) {
    return {
      notifications: [[AmbitoDolar.NOTIFICATION_CLOSE_TYPE, all_rates]],
    };
  }
  if (_.isEmpty(new_rates)) {
    return { notifications: [] };
  }
  if (!has_rates_from_today) {
    return { notifications: [[AmbitoDolar.NOTIFICATION_OPEN_TYPE, all_rates]] };
  }
  const variations = Object.entries(new_rates).map(([type, rate]) => {
    const prev = rates[type]?.[4];
    const curr = rate[4];
    return { type, prev, curr, notify: prev !== curr };
  });
  const variation_rates = _.pick(
    new_rates,
    variations.filter(({ notify }) => notify).map(({ type }) => type),
  );
  return {
    // join variations in a single notification
    notifications: _.isEmpty(variation_rates)
      ? []
      : [[AmbitoDolar.NOTIFICATION_VARIATION_TYPE, variation_rates]],
    variations,
  };
};

export default {
  // fetchFirebaseData,
  // updateFirebaseData,
  updateRealtimeData,
  serviceResponse,
  getDynamoDBClient,
  // getS3Client,
  getAllDataFromDynamoDB,
  isSemverLt,
  getVariationThreshold,
  getNextRateStat,
  addStat,
  mergeHistoricalStats,
  getBodyMessage,
  getSocialCaption,
  getNotifications,
  getJsonObject,
  getTickets,
  getRatesJsonObject,
  getRates,
  storeObject,
  storeJsonObject,
  storeTickets,
  storeHistoricalRatesJsonObject,
  storeRatesJsonObject,
  getDataProviderForRate,
  getDataProviderForMarket,
  getRateUrl,
  getCryptoRatesUrl,
  getSocialScreenshotUrl,
  getExpoClient,
  triggerProcessEvent,
  triggerInvalidateReceiptsEvent,
  triggerNotifyEvent,
  triggerSocialNotifyEvent,
  triggerFundingNotifyEvent,
  // triggerSendSocialNotificationsEvent,
  promiseRetry,
  triggerSocials,
  wrapHandler,
  // TODO: update default limit close to 500 ???
  promiseLimit: (concurrency = MAX_SOCKETS) => pLimit(concurrency),
  getActiveDevices,
  isTruthy,
  isQueryParamTruthy,
};
