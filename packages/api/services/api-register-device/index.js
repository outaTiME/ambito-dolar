const AmbitoDolar = require('@ambito-dolar/core');
const _ = require('lodash');

const { Shared } = require('../../lib/shared');

const client = Shared.getDynamoDBClient();
const MIN_CLIENT_VERSION = '3.0.0';

export default async (req, res) => {
  try {
    // took get parameter as fallback
    const { installation_id = req.query.installation_id, ...extras } =
      req.body || {};
    if (!installation_id) {
      throw new Error(
        'A request query parameter is malformed, missing or has an invalid value'
      );
    }
    let update_expression = 'ADD app_loads :val ';
    const expression_attribute_values = {
      // https://stackoverflow.com/a/58141363
      ':val': 1,
    };
    const timestamp = AmbitoDolar.getTimezoneDate().format();
    // remove undefined values
    const payload = _.omitBy(
      {
        last_update: timestamp,
        ...extras,
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
      TableName: 'ambito-dolar-devices',
      Key: {
        installation_id,
      },
      UpdateExpression: update_expression,
      ExpressionAttributeValues: expression_attribute_values,
      ReturnValues: 'ALL_NEW',
    };
    await client
      .update(params)
      .promise()
      .then(
        function ({ Attributes: data }) {
          const { notification_settings: notificationSettings } = data;
          const results = {
            statusCode: 'success',
            // send notification settings when empty on registration (initial or after purge)
            ...(!payload.notification_settings &&
              notificationSettings && {
                notificationSettings,
              }),
          };
          const { app_version } = payload;
          if (
            process.env.NODE_ENV === 'development' &&
            app_version &&
            Shared.isSemverLt(app_version, MIN_CLIENT_VERSION)
          ) {
            results.statusCode = 'update_app';
            results.statusMessage = `Device with client version ${MIN_CLIENT_VERSION} or later is required`;
          }
          console.info(
            'Registration or interaction for the device completed',
            JSON.stringify(data)
          );
          Shared.serviceResponse(res, 200, results);
        },
        function (error) {
          console.error(
            'Registration or interaction for the device failed',
            JSON.stringify({
              data: {
                installation_id,
                ...payload,
              },
              error: error.message,
            })
          );
          throw error;
        }
      );
  } catch (error) {
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
