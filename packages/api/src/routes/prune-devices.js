import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as _ from 'lodash';

import Shared from '../libs/shared';

const attributes = [
  'app_ownership',
  'app_revision_id',
  'country_name',
  'device_name',
  'ip',
  'platform_model_identifier',
  'platform_model_name',
  'platform_os',
  'platform_version',
];

const ddbClient = Shared.getDynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const pruneDevice = (push_token) => {
  const command = new UpdateCommand({
    TableName: process.env.DEVICES_TABLE_NAME,
    Key: {
      push_token,
    },
    UpdateExpression: `REMOVE ${attributes.join()}`,
  });
  return ddbDocClient.send(command);
};

export const handler = Shared.wrapHandler(async (event) => {
  const { push_token } = event.queryStringParameters || {};
  try {
    let filter_expression = attributes
      .map((attribute) => `attribute_exists(${attribute})`)
      .join(' OR ');
    const expression_attribute_values = {
      // pass
    };
    if (push_token) {
      filter_expression = `push_token = :push_token AND (${filter_expression})`;
      expression_attribute_values[':push_token'] = push_token;
    }
    const params = {
      TableName: process.env.DEVICES_TABLE_NAME,
      ProjectionExpression: 'push_token',
      FilterExpression: filter_expression,
      ...(!_.isEmpty(expression_attribute_values) && {
        ExpressionAttributeValues: expression_attribute_values,
      }),
    };
    const items = await Shared.getAllDataFromDynamoDB(params);
    await Promise.all(items.map(({ push_token }) => pruneDevice(push_token)));
    return Shared.serviceResponse(null, 200, {
      items: _.map(items, 'push_token'),
      amount: items.length,
    });
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
});
