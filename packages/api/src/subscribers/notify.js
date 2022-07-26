import AmbitoDolar from '@ambito-dolar/core';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as _ from 'lodash';

import Shared, {
  MIN_CLIENT_VERSION_FOR_MEP,
  MIN_CLIENT_VERSION_FOR_WHOLESALER,
  MIN_CLIENT_VERSION_FOR_CCB,
} from '../libs/shared';

const ddbClient = Shared.getDynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// app_version is empty on social
const getChangeMessage = (rate, app_version = '6.0.0') => {
  const body = [];
  const value = rate[1];
  if (app_version && Shared.isSemverGte(app_version, '6.0.0')) {
    const value = AmbitoDolar.getRateValue(rate);
    body.push(`${AmbitoDolar.formatRateCurrency(value)}`);
    body.push(`${AmbitoDolar.getRateChange(rate)}`);
    return body.join(' ');
  }
  // old-style
  const change = rate[2];
  if (Array.isArray(value)) {
    body.push(
      `${AmbitoDolar.formatCurrency(value[0])} - ${AmbitoDolar.formatCurrency(
        value[1]
      )}`
    );
  } else {
    body.push(`${AmbitoDolar.formatCurrency(value)}`);
  }
  body.push(` (${AmbitoDolar.formatRateChange(change)})`);
  return body.join('');
};

const getRateMessage = (type, rate, app_version) => {
  const rate_title = AmbitoDolar.getRateTitle(type);
  if (rate_title) {
    return `${rate_title.toUpperCase()}: ${getChangeMessage(
      rate,
      app_version
    )}`;
  }
};

const getBodyMessage = (rates, app_version) => {
  const available_rates = AmbitoDolar.getAvailableRates(rates);
  if (available_rates) {
    const body = _.chain(available_rates)
      .reduce((obj, rate, type) => {
        obj.push(getRateMessage(type, rate, app_version));
    return obj;
      }, [])
      // remove empty messages
      .compact()
      .value();
  if (body.length > 0) {
    return `${body.join(', ')}.`;
    }
  }
};

const getSocialCaption = (type, rates) => {
  const body = getBodyMessage(rates);
  if (body) {
    const title = AmbitoDolar.getNotificationTitle(type);
    return `${title}. ${body}`;
  }
};

const getMessage = (extras = {}) => ({
  priority: 'high',
  sound: 'default',
  ...extras,
});

const getMessagesFromCurrentRate = async (items, type, rates) => {
  try {
    const title = AmbitoDolar.getNotificationTitle(type);
    const messages = items.map(
      ({ installation_id, app_version, push_token, notification_settings }) => {
        const settings = AmbitoDolar.getNotificationSettings(
          notification_settings
        )[type];
        const rates_for_settings = Object.entries(rates).reduce(
          (obj, [type, value]) => {
            // legacy support for settings < MIN_CLIENT_VERSION_FOR_WHOLESALER
            if (type === AmbitoDolar.CCL_TYPE) {
              if (
                settings.rates[AmbitoDolar.CCL_LEGACY_TYPE] !== false &&
                settings.rates[AmbitoDolar.CCL_TYPE] === true
              ) {
                obj[type] = value;
              }
            } else {
              if (settings.rates[type] === true) {
                obj[type] = value;
              }
            }
            return obj;
          },
          {}
        );
        // remove rates not available in app version
        if (Shared.isSemverLt(app_version, MIN_CLIENT_VERSION_FOR_MEP)) {
          delete rates_for_settings[AmbitoDolar.MEP_TYPE];
        }
        if (Shared.isSemverLt(app_version, MIN_CLIENT_VERSION_FOR_WHOLESALER)) {
          delete rates_for_settings[AmbitoDolar.WHOLESALER_TYPE];
        }
        if (Shared.isSemverLt(app_version, MIN_CLIENT_VERSION_FOR_CCB)) {
          delete rates_for_settings[AmbitoDolar.CCB_TYPE];
        }
        const body = getBodyMessage(rates_for_settings, app_version);
        if (body) {
          return getMessage({
            to: push_token,
            title,
            body,
            // internal
            source: {
              installation_id,
              app_version,
              push_token,
            },
          });
        }
      }
    );
    // remove messages without body
    return _.compact(messages);
  } catch (error) {
    console.warn(
      'Unable to build message for notification',
      JSON.stringify({ type, error: error.message })
    );
  }
  // empty when rates or error
  return [];
};

const checkForSetting = (notification_settings = {}, type) => {
  const settings = AmbitoDolar.getNotificationSettings(notification_settings);
  return settings.enabled === true && settings[type].enabled === true;
};

const notify = async (
  items,
  type = AmbitoDolar.NOTIFICATION_CLOSE_TYPE,
  { message: body_message, rates },
  social
) => {
  if (body_message) {
    type = 'custom';
  }
  console.info(
    'New notification',
    JSON.stringify({
      type,
      body_message,
      rates,
      social,
    })
  );
  const tickets = [];
  if (items.length > 0) {
    const messages = [];
    items = _.chain(items)
      // leave the most updated devices on top (newest settings first)
      .orderBy(
        (item) => AmbitoDolar.getTimezoneDate(item.last_update).valueOf(),
        ['desc']
      )
      // exclude duplicates (removing from below)
      .uniqBy('push_token')
      .value();
    if (body_message) {
      // TODO: custom message support for broadcasting?
      const { installation_id, app_version, push_token } = items[0];
      // single item only allowed (installation_id as parameter)
      messages.push(
        getMessage({
          to: push_token,
          body: body_message,
          // internal
          source: {
            installation_id,
            app_version,
            push_token,
          },
        })
      );
    } else {
      // uses getRates when NOTIFICATION_CLOSE_TYPE
      rates = rates || (await Shared.getRates());
      // useful for holidays when NOTIFICATION_CLOSE_TYPE
      const has_rates_from_today = AmbitoDolar.hasRatesFromToday(rates);
      if (has_rates_from_today) {
        // filter the items that have this type of notification enabled
        items = _.filter(items, ({ notification_settings }) =>
          checkForSetting(notification_settings, type)
        );
        // leave testing device only for new notifications when development
        if (process.env.IS_LOCAL && items.length > 1) {
          throw new Error(
            'Only single message can be sent when running on development mode.'
          );
        }
        // exclude when installation_id
        if (social === true) {
          const social_rates = _.omit(rates, [
            // some rate to exclude ???
          ]);
          await Shared.triggerSocialNotifyEvent({
            type,
            title: AmbitoDolar.getNotificationTitle(type),
            caption: getSocialCaption(type, social_rates),
          });
        }
        messages.push(
          ...(await getMessagesFromCurrentRate(items, type, rates))
        );
      } else {
        console.warn('No day rates to notify');
      }
    }
    console.info(
      'Generated messages',
      JSON.stringify({
        amount: messages.length,
      })
    );
    const expo_start_time = Date.now();
    if (messages.length > 0) {
      const expo = Shared.getExpoClient();
      // https://github.com/expo/expo-server-sdk-node/blob/master/src/ExpoClient.ts#L20
      const chunks = expo.chunkPushNotifications(messages);
      const failedChunks = [];
      // FIXME: how to prevent "504 Gateway Time-out" errors?
      // concurrent requests using maxConcurrentRequests opt
      tickets.push(
        ...(await Promise.all(
          chunks.map((chunk) =>
            expo
              .sendPushNotificationsAsync(
                // remove source from message
                chunk.map((message) => _.omit(message, 'source'))
              )
              .then((tickets) =>
                // same order as input
                tickets.map((ticket, index) => {
                  const { title, body: message, source } = chunk[index];
                  return {
                    ...ticket,
                    title,
                    message,
                    ...source,
                  };
                })
              )
              .catch(() => {
                // ignore when error
                /* console.warn(
                  'Unable to send the chunk of messages',
                  JSON.stringify({
                    chunk: index,
                    error: error.message,
                  })
                ); */
                failedChunks.push(chunk);
              })
          )
        ).then((ticketChunks) => _.compact(ticketChunks.flat())))
      );
      const sending_duration = (Date.now() - expo_start_time) / 1000;
      console.info(
        'Sent messages',
        JSON.stringify({
          chunks: chunks.length,
          ...(failedChunks.length > 0 && {
            failed: `${failedChunks.flat().length} (${failedChunks.length})`,
          }),
          tickets: tickets.length,
          duration: sending_duration,
        })
      );
      // save tickets to aws
      const notification_date = AmbitoDolar.getTimezoneDate().format();
      const params = {
        TableName: process.env.NOTIFICATIONS_TABLE_NAME,
        // remove nil values
        Item: _.omitBy(
          {
            date: notification_date,
            type,
            rates,
            tickets: tickets.length,
            duration: sending_duration,
          },
          _.isNil
        ),
      };
      await Promise.all([
        ddbDocClient.send(new PutCommand(params)),
        Shared.storeTickets(notification_date, type, tickets),
      ]).catch((error) => {
        console.warn(
          'Unable to store the notification tickets',
          JSON.stringify({
            error: error.message,
          })
        );
      });
    }
  } else {
    console.warn('No messages to send');
  }
  return {
    tickets: tickets.length,
  };
};

export const handler = Shared.wrapHandler(async (event) => {
  const { type, installation_id, message, rates } = JSON.parse(
    event.Records[0].Sns.Message
  );
  console.info(
    'Message received',
    JSON.stringify({
      type,
      installation_id,
      message,
      rates,
    })
  );
  let filter_expression =
    'attribute_exists(push_token) AND attribute_not_exists(invalidated)';
  const expression_attribute_values = {
    // pass
  };
  if (installation_id) {
    filter_expression =
      'installation_id = :installation_id AND ' + filter_expression;
    expression_attribute_values[':installation_id'] = installation_id;
  }
  const params = {
    TableName: process.env.DEVICES_TABLE_NAME,
    ProjectionExpression:
      'installation_id, app_version, push_token, notification_settings, last_update',
    FilterExpression: filter_expression,
    ...(!_.isEmpty(expression_attribute_values) && {
      ExpressionAttributeValues: expression_attribute_values,
    }),
  };
  const items = await Shared.getAllDataFromDynamoDB(params);
  const results = await notify(
    items,
    type,
    {
      message,
      rates,
    },
    !installation_id && !process.env.IS_LOCAL
  );
  console.info('Completed', JSON.stringify(results));
  return results;
});
