import AmbitoDolar from '@ambito-dolar/core';
import { BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'; // ES Modules import
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import * as _ from 'lodash';
import prettyMilliseconds from 'pretty-ms';

import Shared from '../libs/shared';

const ddbClient = Shared.getDynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// https://gist.githubusercontent.com/rproenca/5b5fbadd38647a40d8be4497fb8aeb8a/raw/4a816abb2283061896f20026a36ae23b2fa5bd1f/dynamodb_batch_delete.js
const invalidateDevices = async (receipts) => {
  const receipt_chunks = _.chain(receipts)
    .map(({ push_token }) => ({
      DeleteRequest: {
        Key: {
          push_token: marshall(push_token),
        },
      },
    }))
    // BatchWriteItem limit
    .chunk(25)
    .value();
  return Promise.all(
    receipt_chunks.map((chunk) => {
      const command = new BatchWriteItemCommand({
        RequestItems: { [process.env.DEVICES_TABLE_NAME]: chunk },
      });
      return ddbDocClient.send(command);
    }),
  );
};

const check = async (items = [], readonly) => {
  if (items.length > 0) {
    const start_time = Date.now();
    const receipts = _.map(items, 'id');
    console.info(
      'Receipts',
      JSON.stringify({
        amount: receipts.length,
      }),
    );
    const expo = Shared.getExpoClient();
    const receipt_chunks = expo.chunkPushNotificationReceiptIds(receipts);
    const limit = Shared.promiseLimit();
    // leave only the records with errors
    const error_receipts = await Promise.all(
      receipt_chunks.map((chunk) =>
        limit(() => expo.getPushNotificationReceiptsAsync(chunk)),
      ),
    )
      // merge objects inside array
      .then((receiptChunks) => Object.assign({}, ...receiptChunks.flat()))
      .then(async (receipts) => {
        const active_devices = await Shared.getActiveDevices();
        return Object.entries(receipts).reduce(
          (obj, [id, { status, message, details }]) => {
            if (
              status === 'error' /* &&
              details?.error === 'DeviceNotRegistered' */
            ) {
              // https://github.com/expo/expo/issues/6414
              const item = _.find(items, { id });
              // leave valid push_tokens (intended for multiple manual executions)
              if (item && active_devices.includes(item.push_token)) {
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
          [],
        );
      })
      .catch((error) => {
        console.error(
          'Unable to get receipts',
          JSON.stringify({
            error: error.message,
          }),
        );
        throw error;
      });
    const non_registered_devices = _.filter(
      error_receipts,
      (receipt) => receipt.details?.error === 'DeviceNotRegistered',
    );
    const trace_errors =
      process.env.IS_LOCAL ||
      error_receipts.length !== non_registered_devices.length;
    if (trace_errors) {
      console.info('Error receipts', JSON.stringify(error_receipts));
    }
    if (!readonly) {
      await invalidateDevices(non_registered_devices);
    }
    const duration = prettyMilliseconds(Date.now() - start_time);
    return {
      // devices: _.map(invalid_receipts, 'push_token'),
      ...(trace_errors && { errors: error_receipts.length }),
      amount: non_registered_devices.length,
      duration,
    };
  } else {
    console.info('No tickets to check');
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
    }),
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
          JSON.stringify({ date, type, error: error.message }),
        );
      }),
    ),
  ).then((data) =>
    _.chain(data)
      .flatten()
      .compact()
      // leave single push_token (when recipient receives multiple messages)
      .uniqBy('push_token')
      .value(),
  );
  const results = await check(tickets, readonly === true);
  console.info('Completed', JSON.stringify(results));
  return results;
});
