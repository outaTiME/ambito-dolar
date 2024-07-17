import AmbitoDolar from '@ambito-dolar/core';
import { marshall } from '@aws-sdk/util-dynamodb';
import * as _ from 'lodash';
import prettyMilliseconds from 'pretty-ms';

import Shared from '../libs/shared';

export const handler = Shared.wrapHandler(async (event) => {
  const { push_token } = event.queryStringParameters || {};
  try {
    const start_time = Date.now();
    // TODO: invalidated field should be removed
    let filter_expression =
      'attribute_exists(push_token) AND attribute_not_exists(invalidated)';
    const expression_attribute_values = {
      // pass
    };
    if (push_token) {
      filter_expression = `push_token = :push_token AND (${filter_expression})`;
      expression_attribute_values[':push_token'] = push_token;
    }
    const params = {
      TableName: process.env.DEVICES_TABLE_NAME,
      ProjectionExpression:
        'push_token, app_version, notification_settings, last_update',
      FilterExpression: filter_expression,
      ...(!_.isEmpty(expression_attribute_values) && {
        ExpressionAttributeValues: expression_attribute_values,
      }),
    };
    const items = await Shared.getAllDataFromDynamoDB(params);
    const ddb_items = _.chain(items)
      // leave the most updated devices on top (newest settings first)
      .orderBy(
        ({ last_update }) => AmbitoDolar.getTimezoneDate(last_update).valueOf(),
        ['desc'],
      )
      // exclude duplicates (removing from below)
      .uniqBy('push_token')
      // take n items from the beginning
      // .take(5000)
      // convert to DynamoDB JSON format (as string)
      .map(({ last_update, ...item }) =>
        JSON.stringify({
          Item: marshall(item),
        }),
      )
      .value();
    const export_date = AmbitoDolar.getTimezoneDate().format();
    // split into chunks (aws limit quota)
    const chunks = _.chunk(ddb_items, 50000);
    await Promise.all(
      chunks.map((items, index) =>
        Shared.storeObject(
          `exports/${export_date}-${index + 1}.jsonl.gz`,
          // use newlines as item delimiters
          items.join('\r\n'),
        ),
      ),
    );
    const duration = prettyMilliseconds(Date.now() - start_time);
    return Shared.serviceResponse(null, 200, {
      amount: `${ddb_items.length} / ${items.length}`,
      chunks: chunks.length,
      duration,
    });
  } catch (error) {
    return Shared.serviceResponse(null, error.code || 400, {
      error: error.message,
    });
  }
});
