const _ = require('lodash');

const { Shared } = require('../../lib/shared');

export default async (req, res) => {
  try {
    Shared.assertPost(req);
    Shared.assertAuthenticated(req);
    const base_rates = req.body || {};
    if (_.isEmpty(base_rates)) {
      throw new Error('No data available');
    }
    await Shared.storeHistoricalRatesJsonObject(base_rates);
    Shared.serviceResponse(res, 200, { status: 'Historical rates updated' });
  } catch (error) {
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
