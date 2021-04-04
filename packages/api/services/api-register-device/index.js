const AmbitoDolar = require('@ambito-dolar/core');
const _ = require('lodash');

const { Shared } = require('../../lib/shared');

const client = Shared.getDynamoDBClient();
const MIN_CLIENT_VERSION = '3.0.0';

const getGeolocationData = async (req) => {
  if (process.env.NODE_ENV !== 'development') {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    /* try {
      // Shared.fetch(`https://freegeoip.net/json/${ip}`)
      // Shared.fetch(`https://reallyfreegeoip.org/json/${ip}`)
      // Shared.fetch(`https://freegeoip.live/json/${ip}`)
      return await Shared.fetch(`https://freegeoip.app/json/${ip}`).then(
        async (response) => {
          const { ip, country_name } = await response.json();
          return {
            ip,
            // prevent empty string on local
            ...(country_name && { country_name }),
          };
        }
      );
    } catch (error) {
      console.warn(
        'Unable to get geolocation data',
        JSON.stringify({ error: error.message })
      );
    } */
    return {
      ip,
    };
  }
  return {
    // empty
  };
};

export default async (req, res) => {
  try {
    // took get parameter as fallback
    const { installation_id = req.query.installation_id, ...extras } =
      req.body || {};
    if (!installation_id) {
      // codes
      // https://developers.getbase.com/docs/rest/articles/errors
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
    const geolocation_data = await getGeolocationData(req);
    // remove undefined values
    const payload = _.omitBy(
      {
        last_update: timestamp,
        ...extras,
        ...geolocation_data,
      },
      // push_token is null on initial registration then undefined
      _.isNil
      // _.isUndefined
    );
    // console.log('>>> installation_id', installation_id);
    // console.log('>>> extras', extras);
    // console.log('>>> payload', payload);
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
    // update_expression = update_expression.slice(0, -2);
    // console.log('>>> update_expression', update_expression);
    // console.log('>>> expression_attribute_values', expression_attribute_values);
    const params = {
      TableName: 'ambito-dolar-devices',
      Key: {
        installation_id,
      },
      UpdateExpression: update_expression,
      ExpressionAttributeValues: expression_attribute_values,
      ReturnValues: 'ALL_NEW',
    };
    client.update(params, (error, { Attributes: data }) => {
      if (error) {
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
      } else {
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
      }
    });
  } catch (error) {
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
