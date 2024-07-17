import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as _ from 'lodash';

import Shared from '../libs/shared';

const ddbClient = Shared.getDynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// const MIN_CLIENT_VERSION = '3.0.0';

export const handler = Shared.wrapHandler(async (event) => {
  try {
    const { push_token, app_version, notification_settings } = JSON.parse(
      event.body || '{}',
    );
    if (!push_token) {
      throw new Error(
        'Request query parameter is malformed, missing or has an invalid value',
      );
    }
    // remove nil values
    const payload = _.omitBy(
      {
        app_version,
        notification_settings,
      },
      _.isNil,
    );
    let update_expression = 'SET ';
    const expression_attribute_values = {};
    Object.keys(payload).forEach((key, index, arr) => {
      update_expression += `${key} = :${key}`;
      if (index < arr.length - 1) {
        update_expression += ', ';
      }
      expression_attribute_values[`:${key}`] = payload[key];
    });
    const command = new UpdateCommand({
      TableName: process.env.DEVICES_TABLE_NAME,
      Key: {
        push_token,
      },
      UpdateExpression: update_expression,
      ExpressionAttributeValues: expression_attribute_values,
      ReturnValues: 'ALL_NEW',
    });
    const { Attributes: data } = await ddbDocClient.send(command);
    const { notification_settings: notificationSettings } = data;
    const results = {
      statusCode: 'success',
      // send notification settings when empty on registration (initial or after purge)
      ...(!payload.notification_settings &&
        notificationSettings && {
          notificationSettings,
        }),
    };
    /* if (
      process.env.IS_LOCAL &&
      app_version &&
      Shared.isSemverLt(app_version, MIN_CLIENT_VERSION)
    ) {
      results.statusCode = 'update_app';
      results.statusMessage = `Device with client version ${MIN_CLIENT_VERSION} or later is required`;
    } */
    console.info(
      'Registration or interaction for the device completed',
      // JSON.stringify(data)
      push_token,
    );
    return Shared.serviceResponse(null, 200, results);
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
});
