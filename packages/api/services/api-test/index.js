const { Shared } = require('../../lib/shared');

export default async (req, res) => {
  try {
    throw new Error('No data available');
  } catch (error) {
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
