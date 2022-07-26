import AmbitoDolar from '@ambito-dolar/core';
import { FontAwesome5 } from '@expo/vector-icons';
import { compose } from '@reduxjs/toolkit';
import * as _ from 'lodash';
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

import MessageView from '../components/MessageView';
import RateView from '../components/RateView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';
import WatermarkOverlayView from './WatermarkOverlayView';

const LAYOUT_COLUMNS = 2;

const SocialView = ({ extraSpace = false }) => {
  const { theme } = Helper.useTheme();
  return (
    <>
      <FontAwesome5
        name="twitter"
        size={17}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="telegram-plane"
        size={17}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="instagram"
        size={17}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="facebook"
        size={17}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="reddit-alien"
        size={17}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="discord"
        size={17}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="slack"
        size={17}
        color={Settings.getGrayColor(theme)}
        style={{
          marginRight: Settings.PADDING,
        }}
      />
      <FontAwesome5
        name="github"
        size={17}
        color={Settings.getGrayColor(theme)}
        style={{
          ...(extraSpace === true && {
            marginRight: Settings.PADDING,
          }),
        }}
      />
    </>
  );
};

const FundingView = () => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <Text
      style={[
        fonts.body,
        {
          color: Settings.getGrayColor(theme),
        },
      ]}
      numberOfLines={1}
    >
      {Helper.removeProtocol(Settings.CAFECITO_URL)}
    </Text>
  );
};

const AppContainer = ({ rates, processedAt }) => {
  const urlParams = new URLSearchParams(document.location.search);
  const title = urlParams.get('title');
  const { theme, fonts } = Helper.useTheme();
  const rateTypes = React.useMemo(
    () => Object.keys(rates) /*.slice(0, -1)*/,
    [rates]
  );
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
          width: AmbitoDolar.VIEWPORT_PORTRAIT_WIDTH,
          height: AmbitoDolar.VIEWPORT_PORTRAIT_HEIGHT,
          // borderWidth: 1,
          borderColor: Settings.getSeparatorColor(theme),
          borderStyle: 'dashed',
          borderRadius: Settings.BORDER_RADIUS,
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
                marginTop: Settings.SMALL_PADDING,
              },
            ]}
            numberOfLines={1}
          >
            {DateUtils.humanize(processedAt, 2)}
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
                    margin: Settings.CARD_PADDING,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'space-evenly',
                      margin: Settings.CARD_PADDING,
                    }}
                  >
                    <View
                      style={{
                        // alignSelf: 'stretch',
                        flexDirection: 'row',
                        justifyContent: 'center',
                      }}
                    >
                      <SocialView />
                    </View>
                    <FundingView />
                  </View>
                </View>
              )}
            </View>
          );
        })}
        {rateTypes.length % LAYOUT_COLUMNS === 0 && (
          <View
            style={{
              flexDirection: 'row',
              // justifyContent: 'space-between',
              justifyContent: 'flex-end',
              margin: Settings.CARD_PADDING,
              alignItems: 'center',
            }}
          >
            <SocialView extraSpace />
            <FundingView />
          </View>
        )}
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
  const rates = AmbitoDolar.getAvailableRates(data?.rates);
  const hasRates = React.useMemo(() => Helper.hasValidRates(rates), [rates]);
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
