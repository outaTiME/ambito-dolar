import AmbitoDolar from '@ambito-dolar/core';
import * as chrono from 'chrono-node/es';
import Joi from 'joi';
import _ from 'lodash';
import hash from 'object-hash';

import Shared, { MAX_NUMBER_OF_STATS, USER_AGENT } from '../libs/shared.js';

const numberValidator = (value, helpers) => {
  // convert to number and truncate
  const number = AmbitoDolar.getNumber(value);
  if (number === null) {
    return helpers.error('any.invalid');
  }
  return number;
};

const getBusinessDay = async () => {
  // ky skips post by default, and this one is a query so it opts back in
  const data = await AmbitoDolar.fetch(process.env.BUSINESS_DAY_URL, {
    method: 'POST',
    retry: { methods: ['post'] },
  }).json();
  const { value, error } = Joi.object({
    isWorkingDay: Joi.boolean().required(),
  })
    .unknown(true)
    .validate(data);
  if (error) {
    throw new Error('Invalid business day schema', { cause: error });
  }
  return value.isWorkingDay;
};

const getRate = (type) => {
  const start_time = Date.now();
  const url = Shared.getRateUrl(type);
  return AmbitoDolar.fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
    },
  })
    .json()
    .then((data) => {
      // validate
      // https://joi.dev/tester/
      const schema = Joi.object()
        .keys({
          fecha: Joi.string().required(),
          // variacion: Joi.string().required(),
          compra: Joi.string().required().custom(numberValidator),
          venta: Joi.string().required().custom(numberValidator),
          // only when TOURIST_TYPE / QATAR_TYPE / SAVING_TYPE / CCL_TYPE / MEP_TYPE
          valor: Joi.string().custom(numberValidator),
        })
        .unknown(true);
      const { value, error } = schema.validate(data);
      if (error) {
        // sometimes 0 as numbers on date and prices on FUTURE_TYPE
        if (data?.compra === 0 && data?.venta === 0) {
          console.info('Skipping empty rate', JSON.stringify({ type, data }));
          return;
        }
        // log error and continue processing
        console.warn(
          'Invalid schema validation on rate',
          JSON.stringify({ type, data, error: error.message }),
        );
        return;
      }
      if ([value.compra, value.venta, value.valor].some((n) => n <= 0)) {
        console.info(
          'Skipping zero or negative rate value',
          JSON.stringify({ type, data }),
        );
        return;
      }
      // parse date string to prevent formatting errors
      const date = chrono.strict.parseDate(value.fecha);
      if (date === null) {
        console.warn('Invalid date on rate', JSON.stringify({ type, data }));
        return;
      }
      // avoid unnecessary updates caused by time changes (reducing update frequency)
      const identity = AmbitoDolar.getTimezoneDate(date).format('l');
      const rate_last = value.valor ? value.valor : [value.compra, value.venta];
      const result = {
        type,
        rate: [identity, rate_last],
      };
      const duration = AmbitoDolar.formatDuration(Date.now() - start_time);
      console.info(
        'Rate fetch completed',
        JSON.stringify({
          type,
          duration,
        }),
      );
      return result;
    })
    .catch((error) => {
      // log error and continue processing
      console.warn(
        'Unable to fetch rate',
        JSON.stringify({ type, error: error.message }),
      );
    });
};

// listing names to market types, one request carries them all
const MARKET_NAMES = {
  'Riesgo País': AmbitoDolar.COUNTRY_RISK_TYPE,
  Merval: AmbitoDolar.MERVAL_TYPE,
};

const getListedMarkets = () =>
  // started inside the chain so even a malformed url lands on the catch
  Promise.resolve()
    .then(() =>
      AmbitoDolar.fetch(process.env.MARKETS_URL, {
        headers: {
          'user-agent': USER_AGENT,
        },
      }).json(),
    )
    .then((data) => {
      const schema = Joi.object()
        .keys({
          fecha: Joi.string().required(),
          ultimo: Joi.string().required().custom(numberValidator),
        })
        .unknown(true)
        .required();
      return Object.entries(MARKET_NAMES).map(([name, type]) => {
        const item = _.find(data, { nombre: name });
        // sometimes 0 as number before the index opens, same as FUTURE_TYPE
        if (item?.ultimo === 0) {
          console.info('Skipping empty market', JSON.stringify({ type, item }));
          return;
        }
        const { value, error } = schema.validate(item);
        if (error) {
          console.warn(
            'Invalid schema validation on market',
            JSON.stringify({ type, error: error.message }),
          );
          return;
        }
        if (value.ultimo <= 0) {
          console.info(
            'Skipping zero or negative market value',
            JSON.stringify({ type, item }),
          );
          return;
        }
        const date = chrono.strict.parseDate(value.fecha);
        if (date === null) {
          console.warn(
            'Invalid date on market',
            JSON.stringify({ type, value }),
          );
          return;
        }
        // same day identity as rates, a time change alone is not an update
        const identity = AmbitoDolar.getTimezoneDate(date).format('l');
        return { type, rate: [identity, value.ultimo] };
      });
    })
    .catch((error) => {
      console.warn(
        'Unable to fetch markets',
        JSON.stringify({ error: error.message }),
      );
    });

// bcra monetary series ids
const BCRA_MARKET_IDS = {
  [AmbitoDolar.INFLATION_TYPE]: 27,
  [AmbitoDolar.INFLATION_ANNUAL_TYPE]: 28,
  [AmbitoDolar.TERM_DEPOSIT_TYPE]: 12,
  [AmbitoDolar.UVA_TYPE]: 31,
  [AmbitoDolar.RESERVES_TYPE]: 1,
};

const getBcraMarket = ([type, id]) =>
  Promise.resolve()
    .then(() =>
      // some series are published ahead, the value of today and never a later one
      AmbitoDolar.fetch(
        `${process.env.BCRA_URL}/${id}?hasta=${AmbitoDolar.getTimezoneDate().format('YYYY-MM-DD')}&limit=1`,
      ).json(),
    )
    .then((data) => {
      const { value: last, error } = Joi.object()
        .keys({
          fecha: Joi.string()
            .pattern(/^\d{4}-\d{2}-\d{2}$/)
            .required(),
          valor: Joi.number().required(),
        })
        .unknown(true)
        .required()
        .validate(data?.results?.[0]?.detalle?.[0]);
      if (error) {
        console.warn(
          'Invalid schema validation on market',
          JSON.stringify({ type, error: error.message }),
        );
        return;
      }
      // the date of the data, a lagged series would read as today otherwise
      return {
        type,
        rate: [last.fecha, last.valor, `${last.fecha}T00:00:00-03:00`],
      };
    })
    .catch((error) => {
      console.warn(
        'Unable to fetch market',
        JSON.stringify({ type, error: error.message }),
      );
    });

/* const getCryptoRates = (rates) => {
  const start_time = Date.now();
  // normalize data
  rates = [].concat(rates).reduce((obj, rate) => {
    const [type, target_type = type] = [].concat(rate);
    obj[type] = target_type;
    return obj;
  }, {});
  const url = Shared.getCryptoRatesUrl();
  return AmbitoDolar.fetch(url)
    .then(async (response) => {
      const data = await response.json();
      // validate
      // https://joi.dev/tester/
      const schema = Joi.object()
        .keys({
          ..._.mapValues(rates, () =>
            Joi.number().required().custom(numberValidator),
          ),
          time: Joi.number().integer().default(Date.now),
        })
        .unknown(true);
      const { value, error } = schema.validate(data);
      if (error) {
        // log error and continue processing
        console.warn(
          'Invalid schema validation on crypto rates',
          JSON.stringify({ rates, data, error: error.message }),
        );
      } else {
        const identity = value.time;
        const result = Object.entries(rates).map(([type, target_type]) => ({
          type: target_type,
          rate: [identity, value[type]],
        }));
        const duration = AmbitoDolar.formatDuration(Date.now() - start_time);
        console.info(
          'Crypto rates fetch completed',
          JSON.stringify({
            rates,
            duration,
          }),
        );
        return result;
      }
    })
    .catch((error) => {
      // log error and continue processing
      console.warn(
        'Unable to fetch crypto rates',
        JSON.stringify({ rates, error: error.message }),
      );
    });
}; */

const getHistoricalRate = (type, rate, { max, max_date } = {}) => {
  // in-memory calculation
  const value = AmbitoDolar.getRateValue(rate);
  // the first value always sets it, zero and negative ones included
  if (max === undefined || value > max) {
    const result = {
      type,
      rate: {
        max: value,
        max_date: rate[0],
      },
    };
    console.info(
      'Historical rate updated',
      JSON.stringify({ type, old: { max, max_date }, new: result.rate }),
    );
    return result;
  }
};

const getObjectRates = (arr) =>
  _.compact([].concat(arr).flat()).reduce((obj, { type, rate }) => {
    obj[type] = rate;
    return obj;
  }, {});

const getRateHash = (rate, length = 10) =>
  hash(rate, { algorithm: 'md5' }).slice(0, length);

const getNewRates = (rates, new_rates) =>
  Object.entries(new_rates).reduce(
    (obj, [type, [identity, rate_last, date]]) => {
      // TODO: rate_last maybe excluded from hash for realtime rates
      const rate_hash = getRateHash([identity, rate_last]);
      // handle initial fix
      const rate = rates[type];
      // detect rate update using hash compare
      if (rate_hash !== _.last(rate)) {
        const { stat: new_rate, variation } = Shared.getNextRateStat(rate, {
          rate_last,
          date,
          rate_hash,
          getThreshold: (prev, curr) =>
            Shared.getVariationThreshold(type, prev, curr),
        });
        console.info(
          'Check for rate variation to notify',
          JSON.stringify({ type, ...variation }),
        );
        obj[type] = new_rate;
        console.info(
          'Rate updated',
          JSON.stringify({
            type,
            old: rate,
            new: new_rate,
          }),
        );
      }
      return obj;
    },
    {},
  );

const getRates = () =>
  Promise.all([
    getRate(AmbitoDolar.OFFICIAL_TYPE),
    getRate(AmbitoDolar.INFORMAL_TYPE),
    // getRate(AmbitoDolar.TOURIST_TYPE),
    // getRate(AmbitoDolar.QATAR_TYPE),
    // getRate(AmbitoDolar.SAVING_TYPE),
    // getRate(AmbitoDolar.LUXURY_TYPE),
    // getRate(AmbitoDolar.CULTURAL_TYPE),
    getRate(AmbitoDolar.WHOLESALE_TYPE),
    // process these rates only on business days
    getRate(AmbitoDolar.BNA_TYPE),
    // getRate(AmbitoDolar.INFORMAL_TYPE),
    getRate(AmbitoDolar.TOURIST_TYPE),
    getRate(AmbitoDolar.CCL_TYPE),
    getRate(AmbitoDolar.MEP_TYPE),
    getRate(AmbitoDolar.CCB_TYPE),
    getRate(AmbitoDolar.EURO_TYPE),
    getRate(AmbitoDolar.EURO_INFORMAL_TYPE),
    getRate(AmbitoDolar.REAL_TYPE),
    getRate(AmbitoDolar.FUTURE_TYPE),
  ]).then(getObjectRates);

const getMarkets = () =>
  Promise.all([
    getListedMarkets(),
    ...Object.entries(BCRA_MARKET_IDS).map(getBcraMarket),
  ]).then(getObjectRates);

const addStats = (items, new_items) =>
  Object.entries(new_items).forEach(([type, stat]) => {
    items[type] ??= {};
    items[type].stats = Shared.addStat(
      items[type].stats,
      stat,
      MAX_NUMBER_OF_STATS,
    );
  });

const getHistoricalRates = (rates, base_rates) =>
  Promise.all(
    Object.entries(rates).map(([type, rate]) =>
      getHistoricalRate(type, rate, base_rates[type]),
    ),
  ).then(getObjectRates);

const notify = (close_day, rates, has_rates_from_today, new_rates) => {
  const { notifications, variations = [] } = Shared.getNotifications({
    close_day,
    rates,
    new_rates,
    has_rates_from_today,
  });
  variations.forEach((variation) =>
    console.info('Notify rate variation', JSON.stringify(variation)),
  );
  return Promise.all(
    notifications.map(([type, rates]) =>
      Shared.triggerNotifyEvent({
        type,
        rates,
      }),
    ),
  );
};

export const handler = Shared.wrapHandler(async (event) => {
  const {
    notify: trigger_notification,
    close: close_day,
    force,
  } = JSON.parse(event.Records[0].Sns.Message);
  console.info(
    'Message received',
    JSON.stringify({
      trigger_notification,
      close_day,
      force,
    }),
  );
  const base_rates = await Shared.getRatesJsonObject().catch((error) => {
    if (error.name === 'NoSuchKey') {
      return {};
    }
    // unhandled error
    throw error;
  });
  if (!force && !base_rates.is_open) {
    const isWorking = await getBusinessDay();
    if (!isWorking) {
      console.info('Non-working day, skipping');
      return;
    }
  }
  base_rates.is_open = !close_day;
  // reduce rate_stats to the last ones
  const rates = await Shared.getRates(base_rates);
  // has rates when processing
  const has_rates_from_today = AmbitoDolar.hasRatesFromToday(rates);
  const [fetched_rates, fetched_markets] = await Promise.all([
    getRates(),
    getMarkets(),
  ]);
  // leave new rates only (for realtime too)
  const new_rates = getNewRates(rates, fetched_rates);
  const new_markets = getNewRates(
    await Shared.getRates({ rates: base_rates.markets }),
    fetched_markets,
  );
  const has_new_rates = !_.isEmpty(new_rates);
  const has_new_markets = !_.isEmpty(new_markets);
  // rates and markets are one payload, either one moves updated_at
  const has_updates = has_new_rates || has_new_markets;
  const processed_at = AmbitoDolar.getTimezoneDate();
  const processed_at_fmt = processed_at.format();
  const processed_at_unix = processed_at.unix();
  if (has_new_rates) {
    // add new_rates to base_rates
    base_rates.rates ??= {};
    addStats(base_rates.rates, new_rates);
    Object.keys(new_rates).forEach((type) => {
      // inject data provider
      base_rates.rates[type].provider = Shared.getDataProviderForRate(type);
    });
    // took historical data in parallel from new rates
    const new_historical_rates = await getHistoricalRates(
      new_rates,
      base_rates.rates,
    );
    // merge new_historical_rates with base_rates
    Object.entries(new_historical_rates).forEach(([type, historical_rate]) => {
      Object.assign(base_rates.rates[type], historical_rate);
    });
  }
  if (has_new_markets) {
    // add new_markets to base_rates
    base_rates.markets ??= {};
    addStats(base_rates.markets, new_markets);
    Object.keys(new_markets).forEach((type) => {
      // inject data provider
      base_rates.markets[type].provider = Shared.getDataProviderForMarket(type);
    });
    // took historical data in parallel from new markets
    const new_historical_markets = await getHistoricalRates(
      new_markets,
      base_rates.markets,
    );
    // merge new_historical_markets with base_rates
    Object.entries(new_historical_markets).forEach(
      ([type, historical_market]) => {
        Object.assign(base_rates.markets[type], historical_market);
      },
    );
  }
  if (has_updates) {
    // add / override updated_at field
    base_rates.updated_at = processed_at_fmt;
  }
  // add / override processed_at field
  base_rates.processed_at = processed_at_fmt;
  // save json files
  await Shared.storeRatesJsonObject(base_rates, has_updates);
  // firebase update should occur after saving json files, the board carries rates only
  await Shared.updateRealtimeData({
    processed_at: processed_at_fmt,
    ...(has_new_rates && {
      data: base_rates,
      updated_at: processed_at_fmt,
      u: processed_at_unix,
    }),
  });
  // notifications should occur after saving json files
  if (trigger_notification === true) {
    await notify(close_day, rates, has_rates_from_today, new_rates);
  }
  console.info('Completed', JSON.stringify(new_rates));
  return new_rates;
});
