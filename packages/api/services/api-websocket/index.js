const { Shared } = require('../../lib/shared');

export default async (req, res) => {
  try {
    // assertions
    // Shared.assertAuthenticated(req);
    // TODO: handle event type and authenticate only on connect
    // TODO: on connect check send update to client if required
    Shared.serviceResponse(res, 200);
  } catch (error) {
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
