const AmbitoDolar = require('@ambito-dolar/core');
const _ = require('lodash');

const {
  Shared,
  MIN_CLIENT_VERSION_FOR_MEP,
  MIN_CLIENT_VERSION_FOR_WHOLESALER,
} = require('../../lib/shared');

const client = Shared.getDynamoDBClient();

const getChangeMessage = (rate) => {
  const body = [];
  const value = rate[1];
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

const getRateMessage = (type, rate) => {
  const rate_title = AmbitoDolar.getRateTitle(type);
  if (rate_title) {
    return `${rate_title.toUpperCase()}: ${getChangeMessage(rate)}`;
  }
};

const getBodyMessage = (rates) => {
  const body = Object.entries(rates).reduce((obj, [type, rate]) => {
    const rate_message = getRateMessage(type, rate);
    if (rate_message) {
      obj.push(rate_message);
    }
    return obj;
  }, []);
  if (body.length > 0) {
    return `${body.join(', ')}.`;
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
      ({
        notification_settings,
        installation_id,
        push_token,
        device_name,
        app_version,
      }) => {
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
        // remove rates on outdated clients
        if (Shared.isSemverLt(app_version, MIN_CLIENT_VERSION_FOR_MEP)) {
          delete rates_for_settings[AmbitoDolar.MEP_TYPE];
        }
        if (Shared.isSemverLt(app_version, MIN_CLIENT_VERSION_FOR_WHOLESALER)) {
          delete rates_for_settings[AmbitoDolar.WHOLESALER_TYPE];
        }
        const body = getBodyMessage(rates_for_settings);
        if (body) {
          return getMessage({
            to: push_token,
            title,
            body,
            // internal
            source: {
              installation_id,
              push_token,
              device_name,
              app_version,
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
      const { installation_id, push_token, device_name, app_version } =
        items[0];
      // single item only allowed (installation_id as parameter)
      messages.push(
        getMessage({
          to: push_token,
          body: body_message,
          // internal
          source: {
            installation_id,
            push_token,
            device_name,
            app_version,
          },
        })
      );
    } else {
      // uses getRates when NOTIFICATION_CLOSE_TYPE
      rates = rates || (await Shared.getRates());
      // useful for holidays when NOTIFICATION_CLOSE_TYPE
      const has_rates_from_today = AmbitoDolar.hasRatesFromToday(rates);
      if (has_rates_from_today) {
        // leave testing device only for new notifications when development
        if (process.env.NODE_ENV === 'development' && items.length > 1) {
          throw new Error(
            'Only single message can be sent when running on development mode.'
          );
        }
        // filter the items that have this type of notification enabled
        items = _.filter(items, ({ notification_settings }) =>
          checkForSetting(notification_settings, type)
        );
        // exclude when installation_id
        if (social === true) {
          await Shared.triggerSocialNotifyEvent({
            type,
            title: AmbitoDolar.getNotificationTitle(type),
            caption: getSocialCaption(type, rates),
          });
        }
        messages.push(
          ...(await getMessagesFromCurrentRate(items, type, rates))
        );
      } else {
        console.warn('No rates today for notification');
      }
    }
    const expo_start_time = Date.now();
    console.info(
      'Generated messages',
      JSON.stringify({
        amount: messages.length,
      })
    );
    if (messages.length > 0) {
      const expo = Shared.getExpoClient();
      // https://github.com/expo/expo-server-sdk-node/blob/master/src/ExpoClient.ts#L20
      const chunks = expo.chunkPushNotifications(
        // create messages array without (internal) source
        messages.map((message) => _.omit(message, 'source'))
      );
      // concurrent requests using maxConcurrentRequests opt
      tickets.push(
        ...(await Promise.all(
          chunks.map((chunk) => expo.sendPushNotificationsAsync(chunk))
        )
          // same order as input
          .then((ticketChunks) => ticketChunks.flat())
          .then((tickets) =>
            tickets.map((ticket, index) => {
              const { title, body: message, source } = messages[index];
              return {
                ...ticket,
                title,
                message,
                ...source,
              };
            })
          )
          .catch((error) => {
            console.error(
              'Unable to send messages',
              JSON.stringify({
                error: error.message,
              })
            );
            throw error;
          }))
      );
      const sending_duration = (Date.now() - expo_start_time) / 1000;
      console.info(
        'Sent messages',
        JSON.stringify({
          amount: `${tickets.length} (${AmbitoDolar.getBytes(chunks)})`,
          duration: sending_duration,
        })
      );
      // save tickets to aws
      const notification_date = AmbitoDolar.getTimezoneDate().format();
      try {
        await Promise.all([
          client
            .put({
              TableName: 'ambito-dolar-notifications',
              Item: {
                date: notification_date,
                type,
                rates,
                tickets: tickets.length,
                duration: sending_duration,
              },
            })
            .promise(),
          Shared.storeTickets(notification_date, type, tickets),
        ]);
      } catch (error) {
        console.warn(
          'Unable to store notification tickets',
          JSON.stringify({
            error: error.message,
          })
        );
      }
    }
  } else {
    console.warn('No messages to send');
  }
  return {
    tickets: tickets.length,
  };
};

export default async (req, res) => {
  try {
    // TODO: export SNS payload processing to generic
    let payload = req.body;
    // https://stackoverflow.com/a/22871339/460939
    // parse body when request comes from SNS as text/plain
    // force content type when request comes from SNS
    const sns_message_type = req.headers['x-amz-sns-message-type'];
    if (sns_message_type) {
      // console.debug('Message received', sns_message_type, req.body);
      // some logs lost when "manually" change the content-type
      // req.headers['content-type'] = 'application/json; charset=utf-8';
      // req.headers['content-type'] = 'application/json';
      payload = JSON.parse(req.body);
      if (
        sns_message_type === 'SubscriptionConfirmation' ||
        sns_message_type === 'UnsubscribeConfirmation'
      ) {
        console.debug('Confirmation message received', payload);
        return Shared.serviceResponse(res, 200, payload);
      }
    }
    Shared.assertAuthenticated(req, payload);
    const {
      type = req.query.type,
      installation_id = req.query.installation_id,
      message = req.query.message,
      rates = req.query.rates,
    } = payload || {};
    console.info(
      'Message received',
      JSON.stringify({
        type,
        installation_id,
        message,
        rates,
      })
    );
    const start_time = Date.now();
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
      TableName: 'ambito-dolar-devices',
      ProjectionExpression:
        'installation_id, device_name, push_token, notification_settings, last_update, app_version',
      FilterExpression: filter_expression,
      ...(!_.isEmpty(expression_attribute_values) && {
        ExpressionAttributeValues: expression_attribute_values,
      }),
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
          try {
            const results = await notify(
              items,
              type,
              {
                message,
                rates,
              },
              !installation_id && process.env.NODE_ENV === 'production'
            );
            const duration = (Date.now() - start_time) / 1000;
            console.info(
              'Completed',
              JSON.stringify({
                ...results,
                duration,
              })
            );
            Shared.serviceResponse(res, 200, {
              ...results,
              duration,
            });
          } catch (error) {
            // FIXME: handle error as warning instead of reject to allow retry in SNS
            throw error;
          }
        }
      }
    };
    client.scan(params, onScan);
  } catch (error) {
    console.error('Failed', error);
    Shared.serviceResponse(res, error.code || 400, {
      error: error.message,
    });
  }
};
