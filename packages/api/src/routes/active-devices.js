import * as _ from 'lodash';

import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async () => {
  try {
    const params = {
      TableName: process.env.DEVICES_TABLE_NAME,
      ProjectionExpression: 'push_token, invalidated',
    };
    const items = await Shared.getAllDataFromDynamoDB(params);
    const push_tokens = _.chain(items)
      .filter((item) => !item.invalidated)
      .map('push_token')
      // remove falsey
      .compact()
      .value();
    return Shared.serviceResponse(null, 200, {
      amount: items.length,
      push_tokens: push_tokens.length,
      // items,
    });
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
});
