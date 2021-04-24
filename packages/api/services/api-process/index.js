const AmbitoDolar = require('@ambito-dolar/core');
const Joi = require('joi');
const _ = require('lodash');
const hash = require('object-hash');

const { Shared, MAX_NUMBER_OF_STATS } = require('../../lib/shared');

const getRateHash = (rate) => hash(rate, { algorithm: 'md5' });

const getRate = (type) => {
  return new Promise((resolve) => {
    const url = Shared.getRateUrl(type);
    Shared.fetch(url)
      .then(async (response) => {
        const data = await response.json();
        // validate
        // https://hapi.dev/module/joi/tester/
        const schema = Joi.object()
          .keys({
            fecha: Joi.string().required(),
            variacion: Joi.string().required(),
            compra: Joi.string().required(),
            venta: Joi.string().required(),
            // only when TOURIST_TYPE / CCL_TYPE / MEP_TYPE
            valor: Joi.string(),
          })
          .unknown(true);
        const { value, error } = schema.validate(data);
        if (error) {
          // log error and continue processing
          console.warn(
            'Invalid schema validation',
            JSON.stringify({ type, data, error: error.message })
          );
          resolve();
        } else {
          const rate = [
            value.valor
              ? AmbitoDolar.getNumber(value.valor)
              : [
                  AmbitoDolar.getNumber(value.compra),
                  AmbitoDolar.getNumber(value.venta),
                ],
            AmbitoDolar.getPercentNumber(value.variacion),
          ];
          const result = {
            type,
            rate: [...rate, getRateHash([value.fecha, rate])],
          };
          resolve(result);
        }
      })
      .catch((error) => {
        // log error and continue processing
        console.warn(
          'Unable to fetch rate',
          JSON.stringify({ type, error: error.message })
        );
        resolve();
      });
  });
};

const getHistoricalRate = (type, rate, { max, max_date }) => {
  // initial fix
  if (max === undefined) {
    return new Promise((resolve) => {
      const url = Shared.getHistoricalRateUrl(type);
      Shared.fetch(url)
        .then(async (response) => {
          const data = await response.json();
          // validate
          // https://hapi.dev/module/joi/tester/
          const schema = Joi.object()
            .keys({
              maximo: Joi.string().required(),
              fecha_maximo: Joi.string().required(),
            })
            .unknown(true);
          const { value, error } = schema.validate(data);
          if (error) {
            // log error and continue processing
            console.warn(
              'Invalid historical schema validation',
              JSON.stringify({ type, data, error: error.message })
            );
            resolve();
          } else {
            const result = {
              type,
              rate: {
                max: AmbitoDolar.getNumber(value.maximo),
                max_date: AmbitoDolar.parseNaturalDate(value.fecha_maximo),
              },
            };
            console.info(
              'Historical rate from remote',
              JSON.stringify({ type, ...result.rate })
            );
            resolve(result);
          }
        })
        .catch((error) => {
          // log error and continue processing
          console.warn(
            'Unable to fetch historical rate',
            JSON.stringify({ type, error: error.message })
          );
          resolve();
        });
    });
  }
  // in-memory calculation
  const value = _.max([].concat(rate[1]));
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

const getRates = () =>
  Promise.all([
    getRate(AmbitoDolar.OFFICIAL_TYPE),
    getRate(AmbitoDolar.TOURIST_TYPE),
    getRate(AmbitoDolar.INFORMAL_TYPE),
    // getRate(AmbitoDolar.FUTURE_TYPE),
    getRate(AmbitoDolar.WHOLESALER_TYPE),
  ]).then(getObjectRates);

const getRealtimeRates = () =>
  Promise.all([
    getRate(AmbitoDolar.CCL_TYPE),
    getRate(AmbitoDolar.MEP_TYPE),
  ]).then(getObjectRates);

const getHistoricalRates = (rates, base_rates) =>
  Promise.all(
    Object.entries(rates).map(([type, rate]) =>
      getHistoricalRate(type, rate, base_rates[type])
    )
  ).then(getObjectRates);

const getNewRates = (rates, new_rates) =>
  Object.entries(new_rates).reduce((obj, [type, new_rate]) => {
    // remove timestamp
    const rate = _.tail(rates[type] || []);
    // hash compare
    if (new_rate[2] !== rate[2]) {
      obj[type] = [AmbitoDolar.getTimezoneDate().format(), ...new_rate];
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

// TODO: remove hash from rates to reduce logging on trigger?

const notifyUpdates = (rates, has_rates_from_today, new_rates) => {
  const notifications = [];
  if (!has_rates_from_today) {
    notifications.push([
      AmbitoDolar.NOTIFICATION_OPEN_TYPE,
      {
        ...rates,
        ...new_rates,
      },
    ]);
  } else {
    // join variations in a single notification
    const variation_rates = Object.entries(new_rates).reduce(
      (obj, [type, rate]) => {
        const prev_rate = rates[type];
        const prev_rate_avg = _.mean([].concat(prev_rate[1]));
        const rate_avg = _.mean([].concat(rate[1]));
        const value_diff = Math.abs(prev_rate_avg - rate_avg);
        const rate_threshold = Shared.getVariationThreshold(type);
        if (value_diff !== 0 && value_diff >= rate_threshold) {
          // variation found
          obj[type] = rate;
        }
        return obj;
      },
      {}
    );
    if (!_.isEmpty(variation_rates)) {
      notifications.push([
        AmbitoDolar.NOTIFICATION_VARIATION_TYPE,
        variation_rates,
      ]);
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
const REALTIME_PROCESSING_INTERVAL = 30;

export default async (req, res) => {
  try {
    // assertions
    Shared.assertAuthenticated(req);
    // process
    const { notify = req.query.notify } = req.body || {};
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
    const new_rates = getNewRates(rates, await getRates());
    // took realtimes
    const in_time =
      AmbitoDolar.getTimezoneDate().minutes() % REALTIME_PROCESSING_INTERVAL ===
      0;
    if (
      // initial process of business day
      (!has_rates_from_today && !_.isEmpty(new_rates)) ||
      // on business day between REALTIME_PROCESSING_INTERVAL ticks
      (has_rates_from_today && in_time)
    ) {
      const new_realtime_rates = getNewRates(rates, await getRealtimeRates());
      Object.assign(new_rates, new_realtime_rates);
    }
    const has_new_rates = !_.isEmpty(new_rates);
    if (has_new_rates) {
      // add new_rates to base_rates
      Object.entries(new_rates).forEach(([type, rate]) => {
        const moment_rate = AmbitoDolar.getTimezoneDate(rate[0]);
        // remove stats from same day of new rate
        const stats = (((base_rates.rates || {})[type] || {}).stats || [])
          .reduce((obj, stat) => {
            if (!moment_rate.isSame(stat[0], 'day')) {
              // leave hash only on new_rate to reduce the file size
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
      Object.entries(new_historical_rates).forEach(
        ([type, historical_rate]) => {
          Object.assign(base_rates.rates[type], historical_rate);
        }
      );
      // add / override updated_at field
      base_rates.updated_at = AmbitoDolar.getTimezoneDate().format();
    }
    // add / override processed_at field
    base_rates.processed_at = AmbitoDolar.getTimezoneDate().format();
    // save json files
    await Promise.all([
      // save rates in old-style (v1)
      has_new_rates && Shared.storeRateStats(base_rates.rates),
      // save rates (v2)
      Shared.storeRatesJsonObject(base_rates),
      // save historical rates
      has_new_rates && Shared.storeHistoricalRatesJsonObject(base_rates),
    ]);
    // firebase update should occur after saving json files
    if (has_new_rates) {
      await Shared.putFirebaseData('updated_at', base_rates.updated_at);
    }
    await Shared.putFirebaseData('processed_at', base_rates.processed_at);
    // notifications should occur after saving json files
    if (has_new_rates && notify !== undefined) {
      await notifyUpdates(rates, has_rates_from_today, new_rates);
    }
    Shared.serviceResponse(res, 200, new_rates);
  } catch (error) {
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
