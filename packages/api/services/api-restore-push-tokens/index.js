const { Shared } = require('../../lib/shared');

const client = Shared.getDynamoDBClient();

const reactivateDevice = async ({ installation_id, push_token }, _date) => {
  const params = {
    TableName: 'ambito-dolar-devices',
    Key: {
      installation_id,
    },
    // ConditionExpression: 'attribute_not_exists(push_token) AND attribute_exists(invalidated)',
    ConditionExpression: 'attribute_not_exists(push_token)',
    // UpdateExpression: 'SET push_token = :push_token REMOVE invalidated',
    UpdateExpression: 'SET push_token = :push_token',
    ExpressionAttributeValues: {
      ':push_token': push_token,
      // ':last_update': date,
    },
    ReturnValues: 'ALL_NEW',
    // ReturnValues: 'UPDATED_NEW',
  };
  return new Promise((resolve, reject) => {
    client
      .update(params)
      .promise()
      .then(
        function (data) {
          // console.log('Device re-activated', installation_id);
          resolve(data);
        },
        function (error) {
          // console.error('Unable to re-activate device', installation_id, error);
          reject(error);
        }
      );
  });
};

const check = async ({ tickets }, date, readonly) => {
  const devices = tickets.reduce((obj, { status, ...extra }) => {
    // if (status === 'ok') {
    obj.push(extra);
    /* } else {
      console.warn('Invalid ticket status', installation_id, status);
    } */
    return obj;
  }, []);
  const reactivated = [];
  const failed = [];
  for (const device of devices) {
    try {
      if (!readonly) {
        await reactivateDevice(device, date);
      }
      reactivated.push(device);
    } catch (error) {
      failed.push(error.message);
    }
  }
  return {
    reactivated,
    failed,
  };
};

export default async (req, res) => {
  try {
    // assertions
    Shared.assertAuthenticated(req);
    // process
    const { date = req.query.date, readonly = req.query.readonly } =
      req.body || {};
    if (!date) {
      // codes
      // https://developers.getbase.com/docs/rest/articles/errors
      throw new Error(
        'A request query parameter is malformed, missing or has an invalid value'
      );
    }
    const filter_expression =
      'attribute_exists(tickets) AND #notification_date = :date_from';
    const expression_attribute_values = {
      // force date
      ':date_from': date,
    };
    const params = {
      TableName: 'ambito-dolar-notifications',
      // ProjectionExpression: 'installation_id, device_name, push_token',
      FilterExpression: filter_expression,
      ExpressionAttributeValues: expression_attribute_values,
      ExpressionAttributeNames: {
        '#notification_date': 'date',
      },
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
          const results = await check(items[0], date, readonly !== undefined);
          Shared.serviceResponse(res, 200, results);
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
