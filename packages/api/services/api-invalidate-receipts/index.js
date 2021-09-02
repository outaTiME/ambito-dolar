const AmbitoDolar = require('@ambito-dolar/core');
const _ = require('lodash');

const { Shared } = require('../../lib/shared');

const client = Shared.getDynamoDBClient();

const invalidateDevice = async (installation_id) => {
  const params = {
    TableName: 'ambito-dolar-devices',
    Key: {
      installation_id,
    },
    UpdateExpression: 'SET invalidated = :invalidated',
    ExpressionAttributeValues: {
      ':invalidated': AmbitoDolar.getTimezoneDate().format(),
    },
  };
  await client
    .update(params)
    .promise()
    .then(
      function (_data) {
        console.info('Device invalidated', JSON.stringify({ installation_id }));
      },
      function (error) {
        console.warn(
          'Unable to invalidate device',
          JSON.stringify({ installation_id, error: error.message })
        );
      }
    );
};

const check = async (items = [], readonly) => {
  if (items.length > 0) {
    const expo = Shared.getExpoClient();
    const receiptIds = _.map(items, 'id');
    const expo_start_time = Date.now();
    console.info(
      'Receipts',
      JSON.stringify({
        amount: receiptIds.length,
      })
    );
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    // leave only the records with errors
    const invalid_receipts = await Promise.all(
      receiptIdChunks.map((chunk, index, arr) =>
        expo.getPushNotificationReceiptsAsync(chunk)
      )
    )
      // merge objects inside array
      .then((receiptChunks) => Object.assign({}, ...receiptChunks.flat()))
      .then((receipts) =>
        Object.entries(receipts).reduce(
          (obj, [id, { status, message, details }]) => {
            if (status === 'error') {
              // https://github.com/expo/expo/issues/6414
              const item = _.find(items, { id });
              if (item) {
                obj.push({
                  ...item,
                  status,
                  message,
                  details,
                });
              }
            }
            return obj;
          },
          []
        )
      )
      .catch((error) => {
        console.error(
          'Unable to get receipts',
          JSON.stringify({
            error: error.message,
          })
        );
        throw error;
      });
    if (!readonly) {
      await Promise.all(
        invalid_receipts.map(({ installation_id }) =>
          invalidateDevice(installation_id)
        )
      );
    }
    const invalidation_duration = (Date.now() - expo_start_time) / 1000;
    console.info(
      'Invalidated devices',
      JSON.stringify({
        amount: invalid_receipts.length,
        duration: invalidation_duration,
      })
    );
    return {
      // items: invalid_receipts,
      amount: invalid_receipts.length,
    };
  } else {
    console.warn('No tickets to check', JSON.stringify({ items }));
  }
  return {
    // empty
  };
};

export default async (req, res) => {
  try {
    // assertions
    Shared.assertAuthenticated(req);
    // process
    const { readonly = req.query.readonly, date_from = req.query.date_from } =
      req.body || {};
    const filter_expression = '#notification_date >= :date_from';
    const expression_attribute_values = {
      ':date_from':
        date_from ||
        AmbitoDolar.getTimezoneDate(undefined, undefined, true)
          // .subtract(1, 'days')
          .format(),
    };
    const params = {
      TableName: 'ambito-dolar-notifications',
      ProjectionExpression: '#notification_date, #notification_type',
      FilterExpression: filter_expression,
      ExpressionAttributeValues: expression_attribute_values,
      ExpressionAttributeNames: {
        '#notification_date': 'date',
        '#notification_type': 'type',
      },
    };
    const items = await Shared.getAllDataFromDynamoDB(params);
    const tickets = await Promise.all(
      items.map(({ date, type }) =>
        Shared.getTickets(date, type).catch((error) => {
          console.warn(
            'Unable to get notification tickets from bucket',
            JSON.stringify({ date, type, error: error.message })
          );
        })
      )
    ).then((data) =>
      _.chain(data).flatten().compact().uniqBy('installation_id').value()
    );
    const results = await check(tickets, readonly !== undefined);
    Shared.serviceResponse(res, 200, results);
  } catch (error) {
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
