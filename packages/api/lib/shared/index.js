const AmbitoDolar = require('@ambito-dolar/core');
const Fetch = require('@zeit/fetch');
const AWS = require('aws-sdk');
const { Expo } = require('expo-server-sdk');
const { JWT } = require('google-auth-library');
const _ = require('lodash');
const semverLt = require('semver/functions/lt');
const zlib = require('zlib');

// defaults

AWS.config.update(JSON.parse(process.env.AWS_CONFIG_JSON));

const dynamoDBClient = new AWS.DynamoDB.DocumentClient({
  // pass
});

const s3 = new AWS.S3({
  // pass
});

const sns = new AWS.SNS({
  // pass
});

// constants

const MIN_CLIENT_VERSION_FOR_MEP = '2.0.0';
const MIN_CLIENT_VERSION_FOR_WHOLESALER = '5.0.0';
const MAX_NUMBER_OF_STATS = 7; // 1 week
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

// run all calls in parallel
const EXPO_CONCURRENT_REQUEST_LIMIT = 0;

// exports

const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;

const getFirebaseAccessToken = async () => {
  const { access_token, expiry_date } = this._firebase_token || {};
  if (!expiry_date || (expiry_date && Date.now() >= expiry_date)) {
    // https://firebase.google.com/docs/database/rest/auth#authenticate_with_an_access_token
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/firebase.database',
    ];
    return new Promise((resolve, reject) => {
      const jwtClient = new JWT({
        email: FIREBASE_CLIENT_EMAIL,
        key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes,
      });
      jwtClient.authorize((err, token) => {
        if (err) {
          reject(err);
          return;
        }
        // internal
        this._firebase_token = token;
        resolve(token.access_token);
      });
    });
  }
  return access_token;
};

const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL;

const fetchFirebaseData = async (uri, opts = {}) => {
  const access_token = await getFirebaseAccessToken();
  const url = new URL(`${FIREBASE_DATABASE_URL}${uri}`);
  url.pathname = url.pathname + '.json';
  url.searchParams.set('access_token', access_token);
  return fetch(url.href, opts).then(async (response) => {
    if (response.ok) {
      return await response.json();
    }
    throw Error(response.statusText);
  });
};

const putFirebaseData = async (uri, payload = {}) => {
  try {
    return await fetchFirebaseData(uri, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn(
      'Unable update firebase with payload',
      JSON.stringify({ uri, payload, error: error.message })
    );
    // trace and continue
  }
};

const serviceResponse = (res, code, json) => res.status(code).json(json);

const getDynamoDBClient = () => dynamoDBClient;

const assertAuthenticated = (req, payload) => {
  const token =
    req.headers['x-access-token'] ||
    req.headers['authorization'] ||
    (payload || req.body || {}).access_token ||
    req.query.access_token;
  if (process.env.SECRET_KEY !== token) {
    const error = new Error(
      'The access token provided is malformed, missing or has an invalid value'
    );
    error.code = 401;
    throw error;
  }
};

const assertPost = (req) => {
  if (req.method !== 'POST') {
    const error = new Error('Method not allowed');
    error.code = 405;
    throw error;
  }
};

const fetch = (url, opts) => Fetch()(url, opts);

const isSemverLt = (v1, v2) => semverLt(v1, v2);

const getVariationThreshold = (type) => {
  if (type === AmbitoDolar.CCL_TYPE || type === AmbitoDolar.MEP_TYPE) {
    return 0.75;
  }
  return 0;
};

const storeJsonObject = async (
  key,
  json,
  bucket = S3_BUCKET,
  is_public = false
) => {
  // try {
  // https://blog.jonathandion.com/posts/json-gzip-s3/
  const buffer = new Buffer.from(JSON.stringify(json));
  const compressed = zlib.gzipSync(buffer);
  return s3
    .putObject({
      Bucket: bucket,
      Key: `${key}.json`,
      Body: compressed,
      ContentType: 'application/json; charset=utf-8',
      ...(is_public === true && { ACL: 'public-read' }),
      CacheControl: 'no-cache',
      // brotli-compressed
      // ContentEncoding: 'br',
      ContentEncoding: 'gzip',
    })
    .promise();
  /* } catch (error) {
    console.warn(
      'Unable to store object in bucket',
      JSON.stringify({ bucket, key, json, error: error.message })
    );
    // trace and continue
  } */
};

const storePublicJsonObject = async (key, json, bucket) =>
  storeJsonObject(key, json, bucket, true);

const getJsonObject = async (key, bucket = S3_BUCKET) => {
  // try {
  return s3
    .getObject({
      Bucket: bucket,
      Key: `${key}.json`,
    })
    .promise()
    .then((data) => {
      const uncompressed = zlib.gunzipSync(data.Body);
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

const storeRateStats = async (rates) => {
  const base_rates = Object.entries(rates || {}).reduce(
    (obj, [type, { stats }]) => {
      // ignore
      if (type === AmbitoDolar.WHOLESALER_TYPE) {
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
    {}
  );
  return storePublicJsonObject(RATE_STATS_OBJECT_KEY, base_rates);
};

const storeTickets = async (date, type, json) =>
  storeJsonObject(`notifications/${date}-${type}`, json);

const getTickets = async (date, type) =>
  getJsonObject(`notifications/${date}-${type}`);

const storeRatesJsonObject = async (rates, is_updated) => {
  const legacy_rates = Object.entries(rates.rates || {}).reduce(
    (obj, [type, rate]) => {
      // ignore
      if (type === AmbitoDolar.WHOLESALER_TYPE) {
        return obj;
      }
      if (type === AmbitoDolar.CCL_TYPE) {
        type = AmbitoDolar.CCL_LEGACY_TYPE;
      }
      obj[type] = rate;
      return obj;
    },
    {}
  );
  return Promise.all([
    // save rates in old-style (v1)
    is_updated && storeRateStats(rates.rates),
    // save rates (v2)
    storePublicJsonObject(RATES_OBJECT_KEY, rates),
    storePublicJsonObject(RATES_LEGACY_OBJECT_KEY, {
      ...rates,
      rates: legacy_rates,
    }),
    // save historical rates
    is_updated && storeHistoricalRatesJsonObject(rates),
  ]);
};

const getRatesJsonObject = async () => getJsonObject(RATES_OBJECT_KEY);

const storeHistoricalRatesJsonObject = async ({ rates }) => {
  const base_rates = await getJsonObject(HISTORICAL_RATES_OBJECT_KEY).catch(
    (error) => {
      if (error.code === 'NoSuchKey') {
        return {};
      }
      // unhandled error
      throw error;
    }
  );
  Object.entries(rates || {}).forEach(([type, { stats }]) => {
    const moment_from = AmbitoDolar.getTimezoneDate(_.last(stats)[0]).subtract(
      1,
      'year'
    );
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
          '[)'
        );
        return include;
      })
      // leave new rate without hash
      .concat(stats.map((stat) => _.take(stat, 3)));
  });
  const legacy_rates = Object.entries(base_rates || {}).reduce(
    (obj, [type, rate]) => {
      // ignore
      if (type === AmbitoDolar.WHOLESALER_TYPE) {
        return obj;
      }
      if (type === AmbitoDolar.CCL_TYPE) {
        type = AmbitoDolar.CCL_LEGACY_TYPE;
      }
      obj[type] = rate;
      return obj;
    },
    {}
  );
  return Promise.all([
    storePublicJsonObject(HISTORICAL_RATES_OBJECT_KEY, base_rates),
    storePublicJsonObject(HISTORICAL_RATES_LEGACY_OBJECT_KEY, legacy_rates),
  ]);
};

const getRates = async (base_rates) => {
  // took only available rates
  base_rates = base_rates || (await getRatesJsonObject().catch(() => {}));
  // reduce rate_stats to the last ones
  const rates = Object.entries(base_rates.rates || {}).reduce(
    (obj, [type, rate]) => {
      obj[type] = _.last(rate.stats);
      return obj;
    },
    {}
  );
  return rates;
};

const getDataProviderForRate = (type) => {
  if (type === AmbitoDolar.CCL_TYPE || type === AmbitoDolar.MEP_TYPE) {
    return 'Rava Bursátil';
  } else if (type === AmbitoDolar.FUTURE_TYPE) {
    return 'ROFEX';
  }
  return 'Ámbito Financiero';
};

const getPathForRate = (type) => {
  if (type === AmbitoDolar.TOURIST_TYPE) {
    return 'dolarturista';
  } else if (type === AmbitoDolar.CCL_TYPE) {
    return 'dolarrava/cl';
  } else if (type === AmbitoDolar.MEP_TYPE) {
    return 'dolarrava/mep';
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

const getHistoricalRateUrl = (type) => {
  const path = getPathForRate(type);
  return _.template(process.env.HISTORICAL_RATE_URL)({
    path,
  });
};

const getSocialScreenshotUrl = (title) => {
  return _.template(process.env.SOCIAL_SCREENSHOT_URL)({
    title: encodeURIComponent(title),
  });
};

const getExpoClient = () =>
  new Expo({
    maxConcurrentRequests: EXPO_CONCURRENT_REQUEST_LIMIT,
  });

// SNS

const publishMessageToTopic = async (event, payload) => {
  const start_time = Date.now();
  console.info(
    'Publising message to sns topic',
    JSON.stringify({
      event,
      payload: _.omit(payload, ['access_token']),
    })
  );
  return sns
    .publish({
      Message: JSON.stringify(payload),
      // https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
      MessageAttributes: {
        event: {
          DataType: 'String',
          StringValue: event,
        },
      },
      TopicArn: process.env.SNS_TOPIC,
    })
    .promise()
    .then((data) => {
      const duration = (Date.now() - start_time) / 1000;
      console.info(
        'Message published to sns topic',
        JSON.stringify({
          id: data.MessageId,
          event,
          duration,
        })
      );
      return data.MessageId;
    })
    .catch((error) => {
      console.warn(
        'Unable to publish message to sns topic',
        JSON.stringify({ event, error: error.message })
      );
    });
};

const publishMessageToTopicSecured = (event, payload) =>
  publishMessageToTopic(event, {
    ...payload,
    // attach access token on payload
    access_token: process.env.SECRET_KEY,
  });

// IFTTT

const triggerEvent = async (event, payload) => {
  const start_time = Date.now();
  console.info(
    'Triggering event',
    JSON.stringify({
      event,
      payload: _.omit(payload, ['access_token']),
    })
  );
  return fetch(
    `https://maker.ifttt.com/trigger/${event}/with/key/${process.env.IFTTT_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    }
  )
    .then((response) => {
      const duration = (Date.now() - start_time) / 1000;
      if (response.ok) {
        console.info(
          'Event triggered',
          JSON.stringify({
            event,
            duration,
          })
        );
        return {
          event,
          duration,
        };
      }
      throw Error(response.statusText);
    })
    .catch((error) => {
      // ignore error and trace
      console.warn(
        'Unable to trigger the event',
        JSON.stringify({ event, error: error.message })
      );
    });
};

const triggerNotifyEvent = async (payload) =>
  publishMessageToTopicSecured('notify', payload);

const triggerSocialNotifyEvent = async (payload) =>
  publishMessageToTopicSecured('social-notify', payload);

const triggerSendSocialNotificationsEvent = async (caption, image_url) => {
  const event = 'send-social-notifications';
  return triggerEvent(image_url ? event + '-with-photo' : event, {
    value1: caption,
    ...(image_url && { value2: image_url }),
  });
};

const storePublicBase64ImageFile = async (image) => {
  return fetch('https://api.imgur.com/3/image', {
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
    if (response.ok) {
      const { data } = await response.json();
      return data;
    }
    throw Error(response.statusText);
  });
};

const Shared = {
  fetchFirebaseData,
  putFirebaseData,
  serviceResponse,
  getDynamoDBClient,
  assertAuthenticated,
  assertPost,
  fetch,
  isSemverLt,
  getVariationThreshold,
  storeJsonObject,
  getJsonObject,
  storeRateStats,
  storeTickets,
  getTickets,
  storeRatesJsonObject,
  getRatesJsonObject,
  storeHistoricalRatesJsonObject,
  getRates,
  getDataProviderForRate,
  getRateUrl,
  getHistoricalRateUrl,
  getSocialScreenshotUrl,
  getExpoClient,
  triggerNotifyEvent,
  triggerSocialNotifyEvent,
  triggerSendSocialNotificationsEvent,
  storePublicBase64ImageFile,
};

module.exports = {
  Shared,
  MIN_CLIENT_VERSION_FOR_MEP,
  MIN_CLIENT_VERSION_FOR_WHOLESALER,
  MAX_NUMBER_OF_STATS,
};
