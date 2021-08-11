const AmbitoDolar = require('@ambito-dolar/core');

const { Shared } = require('../../lib/shared');

export default async (req, res) => {
  // TODO: add query parameter to update clients?
  // TODO: add parameter to update historical data optional?
  try {
    // assertions
    Shared.assertPost(req);
    Shared.assertAuthenticated(req);
    const base_rates = req.body || {};
    if (!base_rates.rates) {
      throw new Error('No data available');
    }
    // add / override updated_at field
    base_rates.updated_at = AmbitoDolar.getTimezoneDate().format();
    // TODO: review the update of processed_at field (should be updated only by processor)
    // add / override processed_at field
    // base_rates.processed_at = AmbitoDolar.getTimezoneDate().format();
    // save json files
    await Shared.storeRatesJsonObject(base_rates, true);
    // firebase update should occur after saving json files
    // silent update
    await Shared.putFirebaseData('updated_at', base_rates.updated_at);
    // await Shared.putFirebaseData('processed_at', base_rates.processed_at),
    Shared.serviceResponse(res, 200, { status: 'Rates updated' });
  } catch (error) {
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
