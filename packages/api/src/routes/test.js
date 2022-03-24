import Shared from '../libs/shared';

export async function handler() {
  try {
    throw new Error('No data available');
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
}
