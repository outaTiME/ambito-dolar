import AmbitoDolar from '@ambito-dolar/core';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as _ from 'lodash';
import pThrottle from 'p-throttle';
import prettyMilliseconds from 'pretty-ms';

import Shared, {
  MIN_CLIENT_VERSION_FOR_MEP,
  MIN_CLIENT_VERSION_FOR_WHOLESALER,
  MIN_CLIENT_VERSION_FOR_CCB,
  MIN_CLIENT_VERSION_FOR_SAVING,
  MIN_CLIENT_VERSION_FOR_QATAR,
  MIN_CLIENT_VERSION_FOR_BNA,
} from '../libs/shared';

const ddbClient = Shared.getDynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const getChangeMessage = (rate) => {
  const body = [];
  const value = rate[1];
  const change = rate[2];
  if (Array.isArray(value)) {
    body.push(
      `${AmbitoDolar.formatRateCurrency(
        value[0],
      )}–${AmbitoDolar.formatRateCurrency(value[1])}`,
    );
  } else {
    body.push(AmbitoDolar.formatRateCurrency(value));
  }
  body.push(` (${AmbitoDolar.formatRateChange(change)})`);
  return body.join('');
};

const getRateMessage = (type, rate) => {
  const rate_title = AmbitoDolar.getRateTitle(type);
  if (rate_title) {
    return `${rate_title.toUpperCase()}: ${getChangeMessage(rate)}`;
  }
};

const getBodyMessage = (rates) => {
  const available_rates = AmbitoDolar.getAvailableRates(rates);
  if (available_rates) {
    const body = _.chain(available_rates)
      .reduce((obj, rate, type) => {
        obj.push(getRateMessage(type, rate));
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

const getMessagesFromCurrentRate = (items, type, rates) => {
  try {
    const title = AmbitoDolar.getNotificationTitle(type);
    const messages = items.map(
      ({ push_token, app_version, notification_settings }) => {
        const settings = AmbitoDolar.getNotificationSettings(
          notification_settings,
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
          {},
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
        if (Shared.isSemverLt(app_version, MIN_CLIENT_VERSION_FOR_SAVING)) {
          delete rates_for_settings[AmbitoDolar.SAVING_TYPE];
        }
        if (Shared.isSemverLt(app_version, MIN_CLIENT_VERSION_FOR_QATAR)) {
          delete rates_for_settings[AmbitoDolar.QATAR_TYPE];
          // delete rates_for_settings[AmbitoDolar.LUXURY_TYPE];
          // delete rates_for_settings[AmbitoDolar.CULTURAL_TYPE];
        }
        if (Shared.isSemverLt(app_version, MIN_CLIENT_VERSION_FOR_BNA)) {
          delete rates_for_settings[AmbitoDolar.BNA_TYPE];
        }
        const body = getBodyMessage(rates_for_settings);
        if (body) {
          return getMessage({
            to: push_token,
            title,
            body,
            // internal
            source: {
              push_token,
              app_version,
            },
          });
        }
      },
    );
    // remove messages without body
    return _.compact(messages);
  } catch (error) {
    console.warn(
      'Unable to build message for notification',
      JSON.stringify({ type, error: error.message }),
    );
  }
  // empty when rates or error
  return [];
};

const checkForSetting = (notification_settings = {}, type) => {
  const settings = AmbitoDolar.getNotificationSettings(notification_settings);
  return settings.enabled === true && settings[type].enabled === true;
};

const sendPushNotifications = async (
  items = [],
  { message: body_message, type, rates },
) => {
  if (body_message) {
    type = 'custom';
  }
  console.info(
    'Send push notifications',
    JSON.stringify({
      body_message,
      type,
      rates,
    }),
  );
  const tickets = [];
  if (items.length > 0) {
    const messages = [];
    /* items = _.chain(items)
      // leave the most updated devices on top (newest settings first)
      .orderBy(
        ({ last_update }) => AmbitoDolar.getTimezoneDate(last_update).valueOf(),
        ['desc'],
      )
      // exclude duplicates (removing from below)
      .uniqBy('push_token')
      .value(); */
    if (body_message) {
      const { push_token, app_version } = items[0];
      // single item only allowed (push_token as parameter)
      messages.push(
        getMessage({
          to: push_token,
          body: body_message,
          // internal
          source: {
            push_token,
            app_version,
          },
        }),
      );
    } else {
      // filter the items that have this type of notification enabled
      items = _.filter(items, ({ notification_settings }) =>
        checkForSetting(notification_settings, type),
      );
      // leave testing device only for new notifications when development
      if (process.env.IS_LOCAL && items.length > 1) {
        throw new Error(
          'Only single messages can be sent while running in development mode',
        );
      }
      messages.push(...(await getMessagesFromCurrentRate(items, type, rates)));
    }
    /* console.info(
      'Generated messages',
      JSON.stringify({
        amount: messages.length,
      })
    ); */
    const expo_start_time = Date.now();
    if (messages.length > 0) {
      const expo = Shared.getExpoClient();
      const chunks = expo.chunkPushNotifications(messages);
      console.info(
        'Generated messages',
        JSON.stringify({
          messages: messages.length,
          chunks: chunks.length,
          limit: expo.pushNotificationChunkSizeLimit,
        }),
      );
      const failedChunks = [];
      // throttle 6 reqs/1.1s (100 notifs each) +10% buffer, under expo 600/s cap (strict mode)
      // https://docs.expo.dev/push-notifications/sending-notifications/#request-errors
      const throttle = pThrottle({ limit: 6, interval: 1100, strict: true });
      const throttled = throttle((chunk, index) =>
        // extra retries required to reduce failures
        Shared.promiseRetry((retry, attempt) =>
          expo
            .sendPushNotificationsAsync(
              // remove source from message
              chunk.map((message) => _.omit(message, 'source')),
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
              }),
            )
            .catch((error) => {
              // https://github.com/expo/expo-server-sdk-node/blob/main/src/ExpoClient.ts#L87
              if (error.statusCode === 429) {
                console.info(
                  'Retrying to send message chunk',
                  JSON.stringify({
                    chunk: index,
                    attempt,
                    error,
                  }),
                );
                return retry(error);
              }
              throw error;
            }),
        ).catch((error) => {
          console.warn(
            'Unable to send the message chunk',
            JSON.stringify({
              chunk: index,
              error,
            }),
          );
          failedChunks.push(chunk);
        }),
      );
      tickets.push(
        ...(await Promise.all(chunks.map(throttled)).then((ticketChunks) =>
          _.compact(ticketChunks.flat()),
        )),
      );
      const duration = prettyMilliseconds(Date.now() - expo_start_time);
      console.info(
        'Messages sent',
        JSON.stringify({
          chunks: chunks.length,
          ...(failedChunks.length > 0 && {
            failed: `${failedChunks.flat().length} (${failedChunks.length})`,
          }),
          tickets: tickets.length,
          duration,
        }),
      );
      // save tickets to aws
      const notification_date = AmbitoDolar.getTimezoneDate().format();
      const command = new PutCommand({
        TableName: process.env.NOTIFICATIONS_TABLE_NAME,
        // remove nil values
        Item: _.omitBy(
          {
            date: notification_date,
            type,
            rates,
            tickets: tickets.length,
            duration,
          },
          _.isNil,
        ),
      });
      await Promise.all([
        ddbDocClient.send(command),
        Shared.storeTickets(notification_date, type, tickets),
      ]).catch((error) => {
        console.warn(
          'Unable to store notification tickets',
          JSON.stringify({
            error: error.message,
          }),
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
  const {
    push_token,
    message,
    type = AmbitoDolar.NOTIFICATION_CLOSE_TYPE,
    rates,
    social = true,
  } = JSON.parse(event.Records[0].Sns.Message);
  // TODO: support message broadcasting?
  if (!push_token && message) {
    throw new Error('Message is malformed, missing or has an invalid value');
  }
  console.info(
    'Message received',
    JSON.stringify({
      push_token,
      message,
      type,
      rates,
      social,
    }),
  );
  // TODO: invalidated field should be removed
  let filter_expression = 'attribute_not_exists(invalidated)';
  const expression_attribute_values = {
    // pass
  };
  if (push_token) {
    filter_expression = 'push_token = :push_token AND ' + filter_expression;
    expression_attribute_values[':push_token'] = push_token;
  }
  const params = {
    TableName: process.env.DEVICES_TABLE_NAME,
    ProjectionExpression: 'push_token, app_version, notification_settings',
    FilterExpression: filter_expression,
    ...(!_.isEmpty(expression_attribute_values) && {
      ExpressionAttributeValues: expression_attribute_values,
    }),
  };
  const promises = [];
  const items = await Shared.getAllDataFromDynamoDB(params).catch((error) => {
    console.warn(
      'Unable to get devices for push notifications',
      JSON.stringify({
        push_token,
        error: error.message,
      }),
    );
  });
  if (items && push_token && message) {
    // send plain message
    promises.push(
      sendPushNotifications(items, {
        message,
      }),
    );
  } else {
    // uses getRates when NOTIFICATION_CLOSE_TYPE
    const current_rates = _.omit(rates || (await Shared.getRates()), [
      // rates to exclude
      AmbitoDolar.QATAR_TYPE,
      AmbitoDolar.SAVING_TYPE,
    ]);
    // useful for holidays when NOTIFICATION_CLOSE_TYPE
    const has_rates_from_today = AmbitoDolar.hasRatesFromToday(current_rates);
    if (has_rates_from_today) {
      if (items) {
        const notification_rates = _.omit(current_rates, [
          // rates to exclude on notifications
        ]);
        promises.push(
          sendPushNotifications(items, {
            type,
            rates: notification_rates,
          }),
        );
      }
      if (social && !push_token && !process.env.IS_LOCAL) {
        const social_rates = _.omit(current_rates, [
          // rates to exclude on socials
        ]);
        promises.push(
          Shared.triggerSocialNotifyEvent({
            type,
            title: AmbitoDolar.getNotificationTitle(type),
            caption: getSocialCaption(type, social_rates),
          }),
        );
      }
    } else {
      console.info('No daily rates for notification');
    }
  }
  const results = await Promise.all(promises);
  console.info('Completed', JSON.stringify(results));
  return results;
});
