import AmbitoDolar from '@ambito-dolar/core';
import Joi from 'joi';
import * as _ from 'lodash';
import hash from 'object-hash';

import Shared, { MAX_NUMBER_OF_STATS } from '../libs/shared';

const numberValidator = (value, helpers) => {
  // convert to number and truncate
  const number = AmbitoDolar.getNumber(value);
  if (number > 0) {
    // replace value with a new value
    return number;
  }
  return helpers.error('any.invalid');
};

const getRate = (type) => {
  const start_time = Date.now();
  const url = Shared.getRateUrl(type);
  return AmbitoDolar.fetch(url, {
    // 15 over default of 30 secs
    timeout: 45 * 1000,
  })
    .then(async (response) => {
      const data = await response.json();
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
        // log error and continue processing
        console.warn(
          'Invalid schema validation on rate',
          JSON.stringify({ type, data, error: error.message })
        );
      } else {
        const identity = value.fecha;
        const rate_last = value.valor
          ? value.valor
          : [value.compra, value.venta];
        const result = {
          type,
          rate: [identity, rate_last],
        };
        const duration = (Date.now() - start_time) / 1000;
        console.info(
          'Fetch rate completed',
          JSON.stringify({
            type,
            duration,
          })
        );
        return result;
      }
    })
    .catch((error) => {
      // log error and continue processing
      console.warn(
        'Unable to fetch rate',
        JSON.stringify({ type, error: error.message })
      );
    });
};

const getCryptoRates = (rates) => {
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
            Joi.number().required().custom(numberValidator)
          ),
          time: Joi.number().integer().default(Date.now),
        })
        .unknown(true);
      const { value, error } = schema.validate(data);
      if (error) {
        // log error and continue processing
        console.warn(
          'Invalid schema validation on crypto rates',
          JSON.stringify({ rates, data, error: error.message })
        );
      } else {
        const identity = value.time;
        const result = Object.entries(rates).map(([type, target_type]) => ({
          type: target_type,
          rate: [identity, value[type]],
        }));
        const duration = (Date.now() - start_time) / 1000;
        console.info(
          'Fetch crypto rates completed',
          JSON.stringify({
            rates,
            duration,
          })
        );
        return result;
      }
    })
    .catch((error) => {
      // log error and continue processing
      console.warn(
        'Unable to fetch crypto rates',
        JSON.stringify({ rates, error: error.message })
      );
    });
};

const getHistoricalRate = (type, rate, { max = 0, max_date }) => {
  // in-memory calculation
  const value = AmbitoDolar.getRateValue(rate);
  if (value > max) {
    const result = {
      type,
      rate: {
        max: value,
        max_date: rate[0],
      },
    };
    console.info(
      'Historical rate updated',
      JSON.stringify({ type, old: { max, max_date }, new: result.rate })
    );
    return result;
  }
};

const getObjectRates = (arr) =>
  _.compact([].concat(arr).flat()).reduce((obj, { type, rate }) => {
    obj[type] = rate;
    return obj;
  }, {});

const getRateHash = (rate) => hash(rate, { algorithm: 'md5' });

const getNewRates = (rates, new_rates) =>
  Object.entries(new_rates).reduce((obj, [type, [identity, rate_last]]) => {
    // TODO: rate_last maybe excluded from hash for realtime rates
    const rate_hash = getRateHash([identity, rate_last]);
    // handle initial fix
    const rate = rates[type];
    // detect rate update using hash compare
    if (rate_hash !== _.last(rate)) {
      // eslint-disable-next-line no-sparse-arrays
      const rate_last_max = AmbitoDolar.getRateValue([, rate_last]);
      // get close rate when first rate of day (open)
      const rate_open = rate
        ? AmbitoDolar.isRateFromToday(rate)
          ? rate[3]
          : AmbitoDolar.getRateValue(rate)
        : rate_last_max;
      // calculate from open / close rate and truncate
      const rate_change_percent = AmbitoDolar.getNumber(
        (rate_last_max / rate_open - 1) * 100
      );
      const new_rate = [
        AmbitoDolar.getTimezoneDate().format(),
        rate_last,
        rate_change_percent,
        rate_open,
        rate_hash,
      ];
      obj[type] = new_rate;
      console.info(
        'Rate updated',
        JSON.stringify({
          type,
          old: rate,
          new: new_rate,
        })
      );
    }
    return obj;
  }, {});

const getRates = (rates) =>
  Promise.all([
    getRate(AmbitoDolar.OFFICIAL_TYPE),
    getRate(AmbitoDolar.INFORMAL_TYPE),
    getRate(AmbitoDolar.TOURIST_TYPE),
    getRate(AmbitoDolar.QATAR_TYPE),
    getRate(AmbitoDolar.SAVING_TYPE),
    // getRate(AmbitoDolar.LUXURY_TYPE),
    // getRate(AmbitoDolar.CULTURAL_TYPE),
    getRate(AmbitoDolar.WHOLESALER_TYPE),
  ])
    .then(getObjectRates)
    .then((new_rates) => getNewRates(rates, new_rates));

// process these rates only on business days
const getBusinessDayRates = (rates, realtime) => {
  const promises = [
    // (for now) informal rate updates on holidays
    // getRate(AmbitoDolar.INFORMAL_TYPE),
    // getRate(AmbitoDolar.CCL_TYPE),
    // getRate(AmbitoDolar.MEP_TYPE),
  ];
  if (realtime) {
    promises.push(
      getRate(AmbitoDolar.CCL_TYPE),
      getRate(AmbitoDolar.MEP_TYPE),
      getCryptoRates([
        // ['cclgd30', AmbitoDolar.CCL_TYPE],
        // ['mepgd30', AmbitoDolar.MEP_TYPE],
        AmbitoDolar.CCB_TYPE,
      ])
    );
  }
  return Promise.all(promises)
    .then(getObjectRates)
    .then((new_rates) => getNewRates(rates, new_rates));
};

const getHistoricalRates = (rates, base_rates) =>
  Promise.all(
    Object.entries(rates).map(([type, rate]) =>
      getHistoricalRate(type, rate, base_rates[type])
    )
  ).then(getObjectRates);

const notify = (
  close_day,
  rates,
  has_rates_from_today,
  new_rates,
  has_new_rates
) => {
  const notifications = [];
  if (close_day === true) {
    notifications.push([
      AmbitoDolar.NOTIFICATION_CLOSE_TYPE,
      {
        ...rates,
        ...new_rates,
      },
    ]);
  } else if (has_new_rates) {
    if (!has_rates_from_today) {
      notifications.push([
        AmbitoDolar.NOTIFICATION_OPEN_TYPE,
        {
          ...rates,
          ...new_rates,
        },
      ]);
    } else {
      const variation_rates = Object.entries(new_rates).reduce(
        (obj, [type, rate]) => {
          const prev_rate = rates[type];
          if (prev_rate) {
            const prev_rate_last = AmbitoDolar.getRateValue(prev_rate);
            const rate_last = AmbitoDolar.getRateValue(rate);
            // truncate decimals
            const value_diff = AmbitoDolar.getNumber(
              Math.abs(prev_rate_last - rate_last)
            );
            const rate_threshold = Shared.getVariationThreshold(
              type,
              prev_rate_last,
              rate_last
            );
            console.info(
              'Looking for rate variation to notify',
              JSON.stringify({
                type,
                diff: value_diff,
                threshold: rate_threshold,
              })
            );
            if (value_diff !== 0 && value_diff > rate_threshold) {
              // variation found
              obj[type] = rate;
            }
          } else {
            // ignore
          }
          return obj;
        },
        {}
      );
      if (!_.isEmpty(variation_rates)) {
        // join variations in a single notification
        notifications.push([
          AmbitoDolar.NOTIFICATION_VARIATION_TYPE,
          variation_rates,
        ]);
      }
    }
  }
  return Promise.all(
    notifications.map(([type, rates]) =>
      Shared.triggerNotifyEvent({
        type,
        rates,
      })
    )
  );
};

// in minutes
const REALTIME_PROCESSING_INTERVAL = 15;

export const handler = Shared.wrapHandler(async (event) => {
  const { notify: trigger_notification, close: close_day } = JSON.parse(
    event.Records[0].Sns.Message
  );
  console.info(
    'Message received',
    JSON.stringify({
      trigger_notification,
      close_day,
    })
  );
  // avoid fetch delays
  const in_time =
    AmbitoDolar.getTimezoneDate().minutes() % REALTIME_PROCESSING_INTERVAL ===
    0;
  const base_rates = await Shared.getRatesJsonObject().catch((error) => {
    if (error.code === 'NoSuchKey') {
      return {};
    }
    // unhandled error
    throw error;
  });
  // reduce rate_stats to the last ones
  const rates = await Shared.getRates(base_rates);
  // has rates when processing
  const has_rates_from_today = AmbitoDolar.hasRatesFromToday(rates);
  // leave new rates only (for realtime too)
  const new_rates = await getRates(rates);
  const is_opening = !has_rates_from_today && !_.isEmpty(new_rates);
  if (is_opening || has_rates_from_today) {
    const realtime = is_opening || in_time;
    const new_business_day_rates = await getBusinessDayRates(rates, realtime);
    Object.assign(new_rates, new_business_day_rates);
  }
  const has_new_rates = !_.isEmpty(new_rates);
  const processed_at = AmbitoDolar.getTimezoneDate();
  const processed_at_fmt = processed_at.format();
  const processed_at_unix = processed_at.unix();
  if (has_new_rates) {
    // add new_rates to base_rates
    Object.entries(new_rates).forEach(([type, rate]) => {
      const moment_rate = AmbitoDolar.getTimezoneDate(rate[0]);
      // remove stats from same day of new rate
      const stats = (((base_rates.rates || {})[type] || {}).stats || [])
        .reduce((obj, stat) => {
          if (!moment_rate.isSame(stat[0], 'day')) {
            // leave rate open and hash only on new_rate to reduce the file size
            obj.push(_.take(stat, 3));
          }
          return obj;
        }, [])
        .concat([rate]);
      if (!base_rates.rates) {
        base_rates.rates = {};
      }
      if (!base_rates.rates[type]) {
        base_rates.rates[type] = {};
      }
      Object.assign(base_rates.rates[type], {
        // leave historical data
        stats: _.takeRight(stats, MAX_NUMBER_OF_STATS),
        // inject data provider
        provider: Shared.getDataProviderForRate(type),
      });
    });
    // took historical data in parallel from new rates
    const new_historical_rates = await getHistoricalRates(
      new_rates,
      base_rates.rates
    );
    // merge new_historical_rates with base_rates
    Object.entries(new_historical_rates).forEach(([type, historical_rate]) => {
      Object.assign(base_rates.rates[type], historical_rate);
    });
    // add / override updated_at field
    base_rates.updated_at = processed_at_fmt;
  }
  // add / override processed_at field
  base_rates.processed_at = processed_at_fmt;
  // save json files
  await Shared.storeRatesJsonObject(base_rates, has_new_rates);
  // firebase update should occur after saving json files
  await Shared.updateFirebaseData('', {
    processed_at: processed_at_fmt,
    ...(has_new_rates && {
      updated_at: processed_at_fmt,
      u: processed_at_unix,
    }),
  });
  // notifications should occur after saving json files
  if (trigger_notification === true) {
    await notify(
      close_day,
      rates,
      has_rates_from_today,
      new_rates,
      has_new_rates
    );
  }
  console.info('Completed', JSON.stringify(new_rates));
  return new_rates;
});
