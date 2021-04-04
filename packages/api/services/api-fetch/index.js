const _ = require('lodash');

const { Shared } = require('../../lib/shared');

export default async (_req, res) => {
  try {
    const results = await Shared.getRates().then((data) => {
      if (!_.isEmpty(data)) {
        return data;
      }
      throw new Error('No data available');
    });
    Shared.serviceResponse(res, 200, results);
  } catch (error) {
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
