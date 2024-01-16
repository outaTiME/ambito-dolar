import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async () => {
  try {
    console.warn('No data available');
    throw new Error('No data available');
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
});
