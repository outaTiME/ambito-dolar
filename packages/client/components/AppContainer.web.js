import AmbitoDolar from '@ambito-dolar/core';
import { FontAwesome5 } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { compose } from 'redux';

import MessageView from '../components/MessageView';
import RateView from '../components/RateView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';
import WatermarkOverlayView from './WatermarkOverlayView';

const { name: APP_NAME } = Constants.manifest;
const LAYOUT_COLUMNS = 2;

const AppContainer = ({ title, rates, hasRates, processedAt }) => {
  const { theme, fonts } = Helper.useTheme();
  const rateTypes = AmbitoDolar.getAvailableRateTypes();
  const getItemView = React.useCallback(
    (type) => (
      <RateView
        {...{
          key: type,
          type,
          stats: rates[type].stats,
          large: true,
        }}
      />
    ),
    [rates]
  );
  if (!hasRates) {
    return <MessageView message={I18n.t('no_available_rates')} />;
  }
  return (
    <>
      <View
        style={{
          padding: Settings.CARD_PADDING,
          alignSelf: 'center',
          // fixed size required by social notifier
          height: AmbitoDolar.WEB_VIEWPORT_SIZE,
          width: AmbitoDolar.WEB_VIEWPORT_SIZE,
        }}
      >
        <View
          style={{
            margin: Settings.CARD_PADDING,
          }}
        >
          <Text
            style={[
              Settings.getFontObject(theme, 'largeTitle'),
              {
                // pass
              },
            ]}
            numberOfLines={1}
          >
            {title || APP_NAME}
          </Text>
          <Text
            style={[
              fonts.title,
              {
                color: Settings.getGrayColor(theme),
                marginTop: Settings.CARD_PADDING,
              },
            ]}
            numberOfLines={1}
          >
            {DateUtils.datetime(processedAt, { long: true })}
          </Text>
        </View>
        {/* two columns layout */}
        {_.chunk(rateTypes, LAYOUT_COLUMNS).map((types, index) => {
          return (
            <View
              key={`rate-item-${index}`}
              style={{
                flex: 1,
                alignSelf: 'stretch',
                flexDirection: 'row',
              }}
            >
              {types.map((type) => getItemView(type))}
              {/* when free slot put the copy */}
              {types.length < LAYOUT_COLUMNS && (
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: Settings.CARD_PADDING,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                    }}
                  >
                    {/* TODO: export socials to helper */}
                    <FontAwesome5
                      name="twitter"
                      size={17}
                      color={Settings.getGrayColor(theme)}
                    />
                    <FontAwesome5
                      name="telegram-plane"
                      size={17}
                      color={Settings.getGrayColor(theme)}
                      style={{
                        marginLeft: Settings.PADDING,
                      }}
                    />
                    <FontAwesome5
                      name="instagram"
                      size={17}
                      color={Settings.getGrayColor(theme)}
                      style={{
                        marginLeft: Settings.PADDING,
                      }}
                    />
                    <FontAwesome5
                      name="facebook"
                      size={17}
                      color={Settings.getGrayColor(theme)}
                      style={{
                        marginLeft: Settings.PADDING,
                      }}
                    />
                    <FontAwesome5
                      name="reddit-alien"
                      size={17}
                      color={Settings.getGrayColor(theme)}
                      style={{
                        marginLeft: Settings.PADDING,
                      }}
                    />
                    <FontAwesome5
                      name="github"
                      size={17}
                      color={Settings.getGrayColor(theme)}
                      style={{
                        marginLeft: Settings.PADDING,
                      }}
                    />
                  </View>
                  <Text
                    style={[
                      fonts.body,
                      {
                        color: Settings.getGrayColor(theme),
                        marginTop: Settings.PADDING,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {Settings.APP_COPYRIGHT}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      <WatermarkOverlayView />
    </>
  );
};

const withRates = (Component) => (props) => {
  const { theme } = Helper.useTheme();
  const url_params = new URLSearchParams(document.location.search);
  const title = url_params.get('title');
  const [data, setData] = React.useState();
  React.useEffect(() => {
    Helper.getRates()
      .then((data) => {
        setData(data);
      })
      .catch((error) => {
        console.warn('Unable to get rates from remote', error);
        setData({});
      });
  }, []);
  if (!data) {
    return (
      <ActivityIndicator
        animating
        color={Settings.getForegroundColor(theme)}
        size="small"
      />
    );
  }
  const rates = data.rates || {};
  const has_rates = Helper.hasRates(rates);
  return (
    <Component
      {...{
        title,
        rates,
        hasRates: has_rates,
        processedAt: data.processed_at,
      }}
      {...props}
    />
  );
};

export default compose(withContainer, withRates)(AppContainer);
