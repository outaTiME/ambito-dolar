import AmbitoDolar from '@ambito-dolar/core';
import { FontAwesome5 } from '@expo/vector-icons';
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

const LAYOUT_COLUMNS = 2;

const AppContainer = ({ rates, processedAt }) => {
  const urlParams = new URLSearchParams(document.location.search);
  const title = urlParams.get('title');
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
            {title || Settings.APP_NAME}
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
                      name="discord"
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
  const [data, setData] = React.useState();
  React.useEffect(() => {
    Helper.getRates()
      .then((data) => {
        setData(data);
      })
      .catch((error) => {
        console.warn('Unable to get rates from remote', error);
        setData({
          rates: {
            // display error message
          },
        });
      });
  }, []);
  const rates = data?.rates;
  const hasRates = React.useMemo(() => Helper.hasRates(rates), [rates]);
  return (
    <>
      {rates ? (
        hasRates ? (
          <Component
            {...{
              rates,
              processedAt: data.processed_at,
            }}
            {...props}
          />
        ) : (
          <MessageView message={I18n.t('no_available_rates')} />
        )
      ) : (
        <ActivityIndicator
          animating
          color={Settings.getForegroundColor(theme)}
          size="small"
        />
      )}
    </>
  );
};

export default compose(withContainer(), withRates)(AppContainer);
