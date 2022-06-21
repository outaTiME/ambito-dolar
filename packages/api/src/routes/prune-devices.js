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

const pruneDevice = async (installation_id) => {
  const params = {
    TableName: process.env.DEVICES_TABLE_NAME,
    Key: {
      installation_id,
    },
    UpdateExpression: `REMOVE ${attributes.join()}`,
  };
  return ddbDocClient.send(new UpdateCommand(params));
};

export async function handler(event) {
  const { installation_id } = event.queryStringParameters || {};
  try {
    let filter_expression = attributes
      .map((attribute) => `attribute_exists(${attribute})`)
      .join(' OR ');
    const expression_attribute_values = {
      // pass
    };
    if (installation_id) {
      filter_expression = `installation_id = :installation_id AND (${filter_expression})`;
      expression_attribute_values[':installation_id'] = installation_id;
    }
    const params = {
      TableName: process.env.DEVICES_TABLE_NAME,
      ProjectionExpression: 'installation_id',
      FilterExpression: filter_expression,
      ...(!_.isEmpty(expression_attribute_values) && {
        ExpressionAttributeValues: expression_attribute_values,
      }),
    };
    const items = await Shared.getAllDataFromDynamoDB(params);
    await Promise.all(
      items.map(({ installation_id }) => pruneDevice(installation_id))
    );
    return Shared.serviceResponse(null, 200, {
      items: _.map(items, 'installation_id'),
      amount: items.length,
    });
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
}
