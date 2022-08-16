import AmbitoDolar from '@ambito-dolar/core';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as _ from 'lodash';

import Shared from '../libs/shared';

const ddbClient = Shared.getDynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const invalidateDevice = async (installation_id) => {
  const params = {
    TableName: process.env.DEVICES_TABLE_NAME,
    Key: {
      installation_id,
    },
    UpdateExpression: 'SET invalidated = :invalidated',
    ExpressionAttributeValues: {
      ':invalidated': AmbitoDolar.getTimezoneDate().format(),
    },
  };
  return ddbDocClient.send(new UpdateCommand(params));
};

const check = async (items = [], readonly) => {
  if (items.length > 0) {
    const expo = Shared.getExpoClient();
    const receiptIds = _.map(items, 'id');
    console.info(
      'Receipts',
      JSON.stringify({
        amount: receiptIds.length,
      })
    );
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    // leave only the records with errors
    const invalid_receipts = await Promise.all(
      receiptIdChunks.map((chunk) =>
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
    return {
      items: _.map(invalid_receipts, 'installation_id'),
      amount: invalid_receipts.length,
    };
  } else {
    console.info('No tickets to check', JSON.stringify({ items }));
  }
  return {
    // empty
  };
};

export const handler = Shared.wrapHandler(async (event) => {
  const { date_from, readonly } = JSON.parse(event.Records[0].Sns.Message);
  console.info(
    'Message received',
    JSON.stringify({
      date_from,
      readonly,
    })
  );
  const filter_expression = '#notification_date >= :date_from';
  const expression_attribute_values = {
    ':date_from':
      date_from ||
      AmbitoDolar.getTimezoneDate(undefined, undefined, true)
        // .subtract(1, 'days')
        .format(),
  };
  const params = {
    TableName: process.env.NOTIFICATIONS_TABLE_NAME,
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
  const results = await check(tickets, readonly === true);
  console.info('Completed', JSON.stringify(results));
  return results;
});
