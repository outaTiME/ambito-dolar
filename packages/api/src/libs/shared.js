import AmbitoDolar from '@ambito-dolar/core';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
// import { StandardRetryStrategy } from '@aws-sdk/util-retry';
import { CaptureConsole as CaptureConsoleIntegration } from '@sentry/integrations';
import * as Sentry from '@sentry/serverless';
import { parallelScan } from '@shelf/dynamodb-parallel-scan';
import { Expo } from 'expo-server-sdk';
import { JWT } from 'google-auth-library';
import * as _ from 'lodash';
import semverGte from 'semver/functions/gte';
import semverLt from 'semver/functions/lt';
import zlib from 'zlib';

import { publish as publishToBsky } from './social/bsky';
import { publish as publishToInstagram } from './social/instagram';
import { publish as publishToMastodon } from './social/mastodon';
import { publish as publishToReddit } from './social/reddit';
// import { publish as publishToTwitter } from './social/twitter';

// defaults

const ddbClient = new DynamoDBClient({
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_util_retry.html#maxattempts
  // retryStrategy: new StandardRetryStrategy(5),
});

const s3Client = new S3Client({
  // pass
});

const snsClient = new SNSClient({
  // pass
});

// constants

export const MIN_CLIENT_VERSION_FOR_MEP = '2.0.0';
export const MIN_CLIENT_VERSION_FOR_WHOLESALER = '5.0.0';
export const MIN_CLIENT_VERSION_FOR_CCB = '6.0.0';
export const MIN_CLIENT_VERSION_FOR_SAVING = '6.1.0';
export const MIN_CLIENT_VERSION_FOR_QATAR = '6.4.0';
export const MAX_NUMBER_OF_STATS = 7; // 1 week
const S3_BUCKET = process.env.S3_BUCKET;
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
const HISTORICAL_QUOTES_OBJECT_KEY = 'historical-' + QUOTES_OBJECT_KEY;

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
  return AmbitoDolar.fetch(url.href, opts).then((response) => response.json());
};

const updateFirebaseData = (uri, payload = {}) =>
  fetchFirebaseData(uri, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.warn(
      'Unable update firebase with payload',
      JSON.stringify({ uri, payload, error: error.message }),
    );
  });

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

/* const getAllDataFromDynamoDB = async (params, allData = []) => {
  const data = await ddbClient.send(new ScanCommand(params));
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
    // ~4000 items per scan (1 MB of data)
    concurrency: 500,
    client,
  });
};

const isSemverLt = (v1, v2) => semverLt(v1, v2);

const isSemverGte = (v1, v2) => semverGte(v1, v2);

const getVariationThreshold = (type, prev_rate, rate) => {
  const realtime_types = [
    AmbitoDolar.CCL_TYPE,
    AmbitoDolar.MEP_TYPE,
    AmbitoDolar.CCB_TYPE,
  ];
  if (realtime_types.includes(type)) {
    // flexible variation of 1% between updates
    return ((prev_rate + rate) / 2) * 0.01;
    // return 2.75;
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
const getJsonObject = (key, bucket = S3_BUCKET) => {
  const bucketParams = {
    Bucket: bucket,
    Key: `${key}.json`,
  };
  // try {
  return s3Client
    .send(new GetObjectCommand(bucketParams))
    .then(async (data) => {
      const bodyContents = await streamToBuffer(data.Body);
      const uncompressed = zlib.gunzipSync(bodyContents);
      return JSON.parse(uncompressed);
      /* const buffer = new Buffer.from(data.Body.toString());
        const uncompressed = zlib.gunzipSync(buffer);
        return JSON.parse(uncompressed); */
    });
  /* } catch (error) {
    // error.code === 'NoSuchKey'
    console.warn(
      'Unable to get object from bucket',
      JSON.stringify({ bucket, key, error: error.message })
    );
    // trace and continue
  } */
};

const getTickets = (date, type) =>
  getJsonObject(`notifications/${date}-${type}`);

const getRatesJsonObject = () => getJsonObject(QUOTES_OBJECT_KEY);

const getRates = async (base_rates) => {
  // took only available rates
  base_rates =
    base_rates ||
    (await getRatesJsonObject().catch(() => {
      // ignore
    }));
  // reduce rate_stats to the last ones
  const rates = Object.entries(base_rates.rates || {}).reduce(
    (obj, [type, rate]) => {
      obj[type] = _.last(rate.stats);
      return obj;
    },
    {},
  );
  return rates;
};

// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-example-creating-buckets.html#s3-example-creating-buckets-upload-file
const storeJsonObject = (key, json, bucket = S3_BUCKET, is_public = false) => {
  // try {
  // https://blog.jonathandion.com/posts/json-gzip-s3/
  const buffer = new Buffer.from(JSON.stringify(json));
  const compressed = zlib.gzipSync(buffer);
  const bucketParams = {
    Bucket: bucket,
    Key: `${key}.json`,
    Body: compressed,
    ContentType: 'application/json; charset=utf-8',
    ...(is_public === true && { ACL: 'public-read' }),
    CacheControl: 'no-cache',
    // brotli-compressed
    // ContentEncoding: 'br',
    ContentEncoding: 'gzip',
  };
  return s3Client.send(new PutObjectCommand(bucketParams));
  /* } catch (error) {
    console.warn(
      'Unable to store object in bucket',
      JSON.stringify({ bucket, key, json, error: error.message })
    );
    // trace and continue
  } */
};

const storeTickets = (date, type, json) =>
  storeJsonObject(`notifications/${date}-${type}`, json);

const storePublicJsonObject = (key, json, bucket) =>
  storeJsonObject(key, json, bucket, true);

const storeRateStats = (rates) => {
  const base_rates = Object.entries(rates || {}).reduce(
    (obj, [type, { stats }]) => {
      // ignore
      if (
        type === AmbitoDolar.WHOLESALER_TYPE ||
        type === AmbitoDolar.CCB_TYPE ||
        type === AmbitoDolar.SAVING_TYPE ||
        type === AmbitoDolar.QATAR_TYPE /* ||
        type === AmbitoDolar.LUXURY_TYPE ||
        type === AmbitoDolar.CULTURAL_TYPE */
      ) {
        return obj;
      }
      if (type === AmbitoDolar.CCL_TYPE) {
        type = AmbitoDolar.CCL_LEGACY_TYPE;
      }
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
    },
    {},
  );
  return storePublicJsonObject(RATE_STATS_OBJECT_KEY, base_rates);
};

const storeHistoricalRatesJsonObject = async (rates) => {
  let base_rates = rates;
  // when rates comes from storeRatesJsonObject
  if (rates?.rates) {
    // merge
    base_rates = await getJsonObject(HISTORICAL_QUOTES_OBJECT_KEY).catch(
      (error) => {
        if (error.code === 'NoSuchKey') {
          return {};
        }
        // unhandled error
        throw error;
      },
    );
    Object.entries(rates.rates || {}).forEach(([type, { stats }]) => {
      const moment_from = AmbitoDolar.getTimezoneDate(
        _.last(stats)[0],
      ).subtract(1, 'year');
      const moment_to = AmbitoDolar.getTimezoneDate(_.first(stats)[0]);
      // limit base_rates excluding stats
      base_rates[type] = (base_rates[type] || [])
        .filter(([timestamp]) => {
          const moment_timestamp = AmbitoDolar.getTimezoneDate(timestamp);
          const include = moment_timestamp.isBetween(
            moment_from,
            moment_to,
            'day',
            // moment_to exclusion
            '[)',
          );
          return include;
        })
        // leave new rate without rate open and hash
        .concat(stats.map((stat) => _.take(stat, 3)));
    });
  }
  const legacy_rates = Object.entries(base_rates || {}).reduce(
    (obj, [type, rate]) => {
      // ignore
      if (
        type === AmbitoDolar.WHOLESALER_TYPE ||
        type === AmbitoDolar.CCB_TYPE ||
        type === AmbitoDolar.SAVING_TYPE ||
        type === AmbitoDolar.QATAR_TYPE /* ||
        type === AmbitoDolar.LUXURY_TYPE ||
        type === AmbitoDolar.CULTURAL_TYPE */
      ) {
        return obj;
      }
      if (type === AmbitoDolar.CCL_TYPE) {
        type = AmbitoDolar.CCL_LEGACY_TYPE;
      }
      obj[type] = rate;
      return obj;
    },
    {},
  );
  return Promise.all([
    storePublicJsonObject(HISTORICAL_RATES_LEGACY_OBJECT_KEY, legacy_rates),
    storePublicJsonObject(
      HISTORICAL_RATES_OBJECT_KEY,
      _.omit(base_rates, [
        AmbitoDolar.CCB_TYPE,
        AmbitoDolar.SAVING_TYPE,
        AmbitoDolar.QATAR_TYPE,
        // AmbitoDolar.LUXURY_TYPE
        // AmbitoDolar.CULTURAL_TYPE
      ]),
    ),
    storePublicJsonObject(HISTORICAL_QUOTES_OBJECT_KEY, base_rates),
  ]);
};

const storeRatesJsonObject = (rates, is_updated) => {
  const legacy_rates = Object.entries(rates.rates || {}).reduce(
    (obj, [type, rate]) => {
      // ignore
      if (
        type === AmbitoDolar.WHOLESALER_TYPE ||
        type === AmbitoDolar.CCB_TYPE ||
        type === AmbitoDolar.SAVING_TYPE ||
        type === AmbitoDolar.QATAR_TYPE /* ||
        type === AmbitoDolar.LUXURY_TYPE ||
        type === AmbitoDolar.CULTURAL_TYPE */
      ) {
        return obj;
      }
      if (type === AmbitoDolar.CCL_TYPE) {
        type = AmbitoDolar.CCL_LEGACY_TYPE;
      }
      obj[type] = rate;
      return obj;
    },
    {},
  );
  return Promise.all([
    is_updated && storeRateStats(rates.rates),
    storePublicJsonObject(RATES_LEGACY_OBJECT_KEY, {
      ...rates,
      rates: legacy_rates,
    }),
    storePublicJsonObject(RATES_OBJECT_KEY, {
      ...rates,
      rates: _.omit(rates.rates, [
        AmbitoDolar.CCB_TYPE,
        AmbitoDolar.SAVING_TYPE,
        AmbitoDolar.QATAR_TYPE,
        // AmbitoDolar.LUXURY_TYPE
        // AmbitoDolar.CULTURAL_TYPE
      ]),
    }),
    storePublicJsonObject(QUOTES_OBJECT_KEY, rates),
    // save historical rates
    is_updated && storeHistoricalRatesJsonObject(rates),
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

const getPathForRate = (type) => {
  if (type === AmbitoDolar.TOURIST_TYPE) {
    return 'dolarturista';
  } else if (type === AmbitoDolar.SAVING_TYPE) {
    return 'dolarahorro';
  } else if (type === AmbitoDolar.CCL_TYPE) {
    return 'dolarrava/cl';
  } else if (type === AmbitoDolar.MEP_TYPE) {
    return 'dolarrava/mep';
  } else if (type === AmbitoDolar.QATAR_TYPE) {
    return 'dolarqatar';
  } else if (type === AmbitoDolar.LUXURY_TYPE) {
    return 'dolardelujo';
  } else if (type === AmbitoDolar.CULTURAL_TYPE) {
    return 'dolarcoldplay';
  } else if (type === AmbitoDolar.CCB_TYPE) {
    return 'dolarcripto';
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
  /* return (
    process.env.SOCIAL_SCREENSHOT_URL + '?data=' + AmbitoDolar.crushJson(data)
  ); */
};

const getExpoClient = () =>
  new Expo({
    // disable concurrent HTTP requests
    // maxConcurrentRequests: 0,
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
  const params = {
    Message: JSON.stringify(payload),
    MessageStructure: 'string',
    // https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
    MessageAttributes: {
      event: {
        DataType: 'String',
        StringValue: event,
      },
    },
    TopicArn: process.env.SNS_TOPIC,
  };
  return snsClient
    .send(new PublishCommand(params))
    .then(({ MessageId: id }) => {
      const duration = (Date.now() - start_time) / 1000;
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

const triggerEvent = (event, payload) => {
  const start_time = Date.now();
  console.info(
    'Triggering event',
    JSON.stringify({
      event,
      payload,
    }),
  );
  return AmbitoDolar.fetch(
    `https://maker.ifttt.com/trigger/${event}/with/key/${process.env.IFTTT_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    },
  )
    .then(() => {
      const duration = (Date.now() - start_time) / 1000;
      console.info(
        'Event triggered',
        JSON.stringify({
          event,
          duration,
        }),
      );
      return {
        event,
        duration,
      };
    })
    .catch((error) => {
      // ignore error and trace
      console.warn(
        'Unable to trigger the event',
        JSON.stringify({ event, error: error.message }),
      );
    });
};

const triggerSendSocialNotificationsEvent = (caption, image_url) =>
  triggerEvent('ambito-dolar-social-notifications', {
    value1: caption,
    ...(image_url && { value2: image_url }),
  });

const triggerSocials = (targets, caption, url, file, story_file) => {
  const promises = _.chain(
    targets ?? [
      'ifttt',
      'instagram',
      'mastodon',
      'reddit',
      // 'twitter',
      'bsky',
    ],
  )
    .map((target) => {
      let promise;
      switch (target) {
        case 'ifttt':
          promise = triggerSendSocialNotificationsEvent(caption, url);
          break;
        case 'instagram':
          if (file) {
            promise = publishToInstagram(file, caption, story_file);
          }
          break;
        case 'mastodon':
          promise = publishToMastodon(caption, file);
          break;
        case 'reddit':
          promise = publishToReddit(caption, url);
          break;
        /* case 'twitter':
          promise = publishToTwitter(caption, file);
          break; */
        case 'bsky':
          promise = publishToBsky(caption, file);
          break;
      }
      if (promise) {
        return [target, promise];
      }
      // invalid
    })
    // remove falsey
    .compact()
    .map(([target, promise]) =>
      // ignore error and trace
      promise.catch((error) => {
        console.warn(
          'Unable to trigger social',
          JSON.stringify({
            target,
            error: error.message,
          }),
        );
      }),
    )
    .value();
  // remove errors
  return Promise.all(promises).then(_.compact);
};

const storeImgurFile = (image) =>
  // AmbitoDolar.fetch('https://api.imgur.com/3/image', {
  AmbitoDolar.fetch('https://api.imgur.com/3/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
    },
    body: JSON.stringify({
      image,
      type: 'base64',
    }),
  }).then(async (response) => {
    const { data } = await response.json();
    return data.link;
  });

const fetchImage = (url) =>
  AmbitoDolar.fetch(url).then(async (response) =>
    Buffer.from(await response.arrayBuffer()),
  );

const wrapHandler = (handler) => {
  if (!process.env.IS_LOCAL) {
    Sentry.AWSLambda.init({
      dsn: process.env.SENTRY_DSN,
      // disable performance monitoring
      // tracesSampleRate: 1.0,
      integrations: [
        new CaptureConsoleIntegration({
          levels: ['warn', 'error'],
        }),
      ],
    });
    return Sentry.AWSLambda.wrapHandler(handler);
  }
  return handler;
};

export default {
  // fetchFirebaseData,
  updateFirebaseData,
  serviceResponse,
  getDynamoDBClient,
  getAllDataFromDynamoDB,
  isSemverLt,
  isSemverGte,
  getVariationThreshold,
  getJsonObject,
  getTickets,
  getRatesJsonObject,
  getRates,
  storeJsonObject,
  storeTickets,
  storeHistoricalRatesJsonObject,
  storeRatesJsonObject,
  getDataProviderForRate,
  getRateUrl,
  getCryptoRatesUrl,
  getSocialScreenshotUrl,
  getExpoClient,
  triggerProcessEvent,
  triggerInvalidateReceiptsEvent,
  triggerNotifyEvent,
  triggerSocialNotifyEvent,
  triggerFundingNotifyEvent,
  triggerSendSocialNotificationsEvent,
  triggerSocials,
  storeImgurFile,
  fetchImage,
  wrapHandler,
};
