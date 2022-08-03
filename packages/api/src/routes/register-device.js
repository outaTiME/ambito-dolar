import AmbitoDolar from '@ambito-dolar/core';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as _ from 'lodash';

import Shared from '../libs/shared';

const ddbClient = Shared.getDynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const MIN_CLIENT_VERSION = '3.0.0';

export const handler = Shared.wrapHandler(async (event) => {
  try {
    const { installation_id, app_version, push_token, notification_settings } =
      JSON.parse(event.body || '{}');
    if (!installation_id) {
      throw new Error(
        'Request query parameter is malformed, missing or has an invalid value'
      );
    }
    let update_expression = 'ADD app_loads :val ';
    const expression_attribute_values = {
      // https://stackoverflow.com/a/58141363
      ':val': 1,
    };
    const timestamp = AmbitoDolar.getTimezoneDate().format();
    // remove nil values
    const payload = _.omitBy(
      {
        app_version,
        push_token,
        notification_settings,
        // dynamic attributes
        last_update: timestamp,
      },
      // push_token is null on initial registration then undefined
      _.isNil
      // _.isUndefined
    );
    if (payload.push_token) {
      // push permission granted again?
      // reactivate device (if invalidated)
      update_expression += 'REMOVE invalidated ';
    }
    update_expression += 'SET ';
    const keys = Object.keys(payload);
    for (const key of keys) {
      update_expression += `${key} = :${key}, `;
      expression_attribute_values[`:${key}`] = payload[key];
    }
    // attach create / update time
    update_expression += 'created = if_not_exists(created, :created)';
    expression_attribute_values[':created'] = timestamp;
    const params = {
      TableName: process.env.DEVICES_TABLE_NAME,
      Key: {
        installation_id,
      },
      UpdateExpression: update_expression,
      ExpressionAttributeValues: expression_attribute_values,
      ReturnValues: 'ALL_NEW',
    };
    const { Attributes: data } = await ddbDocClient.send(
      new UpdateCommand(params)
    );
    const { notification_settings: notificationSettings } = data;
    const results = {
      statusCode: 'success',
      // send notification settings when empty on registration (initial or after purge)
      ...(!payload.notification_settings &&
        notificationSettings && {
          notificationSettings,
        }),
    };
    // TODO: remove condition on 6.x release ???
    if (
      process.env.IS_LOCAL &&
      app_version &&
      Shared.isSemverLt(app_version, MIN_CLIENT_VERSION)
    ) {
      results.statusCode = 'update_app';
      results.statusMessage = `Device with client version ${MIN_CLIENT_VERSION} or later is required`;
    }
    console.info(
      'Registration or interaction for the device completed',
      // JSON.stringify(data)
      installation_id
    );
    return Shared.serviceResponse(null, 200, results);
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
});
