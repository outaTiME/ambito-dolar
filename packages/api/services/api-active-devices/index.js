const _ = require('lodash');

const { Shared } = require('../../lib/shared');

const client = Shared.getDynamoDBClient();

export default async (_req, res) => {
  try {
    const filter_expression = 'app_ownership <> :app_ownership';
    const expression_attribute_values = {
      ':app_ownership': 'expo',
    };
    const params = {
      TableName: 'ambito-dolar-devices',
      ProjectionExpression:
        'installation_id, platform_os, push_token, invalidated',
      FilterExpression: filter_expression,
      ExpressionAttributeValues: expression_attribute_values,
    };
    const items = [];
    const onScan = async (error, data) => {
      if (error) {
        throw error;
      } else {
        items.push(...data.Items);
        // continue scanning if we have more items, because scan can retrieve a maximum of 1MB of data
        if (typeof data.LastEvaluatedKey !== 'undefined') {
          params.ExclusiveStartKey = data.LastEvaluatedKey;
          client.scan(params, onScan);
        } else {
          // done
          const platform_os = _.countBy(items, 'platform_os');
          const push_tokens = _.chain(items)
            .filter((item) => {
              return !item.invalidated;
            })
            .map('push_token')
            // remove falsey
            .compact()
            .value();
          Shared.serviceResponse(res, 200, {
            count: items.length,
            platform_os,
            push_tokens: push_tokens.length,
            // items,
          });
        }
      }
    };
    client.scan(params, onScan);
  } catch (error) {
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
