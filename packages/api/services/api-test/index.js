// const AmbitoDolar = require('@ambito-dolar/core');

const { Shared } = require('../../lib/shared');

export default async (req, res) => {
  try {
    throw new Error('No data available');
    /* const moment_from = AmbitoDolar.getTimezoneDate(
      '2020-10-23T16:15:08-03:00'
    ).subtract(1, 'year');
    const moment_to = AmbitoDolar.getTimezoneDate('2020-10-15T16:25:06-03:00');
    const timestamp = '2019-10-23';
    // ignore timezone on timestamp (when plain timestamp date only without time)
    const moment_timestamp = AmbitoDolar.getTimezoneDate(
      timestamp,
      undefined,
      true
    );
    const include = moment_timestamp.isBetween(
      moment_from,
      moment_to,
      'day',
      // moment_to exclusion
      '[)'
    );
    Shared.serviceResponse(res, 200, {
      from: moment_from.format(),
      to: moment_to.format(),
      timestamp: moment_timestamp.format(),
      include,
    }); */
    /* const updated_at = '2021-03-31T18:00:00-03:00';
    await Shared.putFirebaseData('updated_at', updated_at); */
    /* const updated_at = await Shared.fetchFirebaseData('updated_at');
    Shared.serviceResponse(res, 200, {
      updated_at,
    }); */
  } catch (error) {
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
