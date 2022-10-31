import AmbitoDolar from '@ambito-dolar/core';
import { FontAwesome5 } from '@expo/vector-icons';
import { compose } from '@reduxjs/toolkit';
import * as _ from 'lodash';
import React from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';

import appIcon from '../assets/about-icon-borderless.png';
import CardView from '../components/CardView';
import MessageView from '../components/MessageView';
import RateView from '../components/RateView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';
import WatermarkOverlayView from './WatermarkOverlayView';

const LAYOUT_RATE_COLUMNS = 2;

const SocialPortraitView = ({ square, watermark = true, children }) => {
  const { theme } = Helper.useTheme();
  const isSquare = square === true;
  return (
    <>
      <View
        style={{
          padding: Settings.CARD_PADDING,
          alignSelf: 'center',
          // fixed size required by social notifier
          width: AmbitoDolar.VIEWPORT_PORTRAIT_WIDTH,
          height: isSquare
            ? AmbitoDolar.VIEWPORT_PORTRAIT_WIDTH
            : AmbitoDolar.VIEWPORT_PORTRAIT_HEIGHT,
          borderColor: Settings.getSeparatorColor(theme),
          borderStyle: 'dashed',
          borderRadius: Settings.BORDER_RADIUS,
          // borderWidth: 1,
        }}
      >
        {children}
      </View>
      {watermark === true && <WatermarkOverlayView />}
    </>
  );
};

const withStats = (Component) => (props) => {
  const { theme } = Helper.useTheme();
  const [stats, setStats] = React.useState();
  React.useEffect(() => {
    Helper.getStats()
      .then((data) => {
        setStats(data);
      })
      .catch((error) => {
        console.warn('Unable to get stats from remote', error);
        setStats({
          // display error message
        });
      });
  }, []);
  const hasStats = React.useMemo(() => Helper.isValid(stats), [stats]);
  return (
    <>
      {stats ? (
        hasStats ? (
          <Component
            {...{
              ...stats,
              ...props,
            }}
          />
        ) : (
          <MessageView message={I18n.t('no_available_stats')} />
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

const StatView = ({ title, current, change }) => {
  const { theme, fonts } = Helper.useTheme();
  // convert change to number
  change = parseFloat(change);
  const color = React.useMemo(
    () => Helper.getChangeColor(change, theme),
    [change, theme]
  );
  const change_fmt = React.useMemo(
    () => AmbitoDolar.getRateChange(change, true),
    [change]
  );
  /* const change_fmt = React.useMemo(
    () => AmbitoDolar.getRateChange([null, current, change, prev], true),
    [change]
  ); */
  return (
    <CardView
      style={
        {
          // flex: 1,
          // paddingHorizontal: Settings.CARD_PADDING * 2,
          // paddingVertical: Settings.CARD_PADDING,
        }
      }
    >
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            // alignSelf: 'stretch',
            // padding: Settings.CARD_PADDING * 2,
          },
        ]}
      >
        <Text
          style={[
            fonts.title,
            {
              flex: 1,
              flexShrink: 1,
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[fonts.largeTitle]} numberOfLines={1}>
            {
              // AmbitoDolar.formatNumberHumanized(current)
              Helper.formatIntegerNumber(current)
            }
          </Text>
          <Text
            style={[
              fonts.body,
              {
                color,
              },
            ]}
            numberOfLines={1}
          >
            {change_fmt}
          </Text>
        </View>
      </View>
    </CardView>
  );
};

const FundingContainer = compose(withStats)(
  ({ title, users, events, conversions }) => {
    const { theme, fonts } = Helper.useTheme();
    const currentMonth = DateUtils.get().format('MMMM YYYY');
    return (
      <SocialPortraitView square watermark>
        <View
          style={{
            flex: 1,
            paddingHorizontal: 75,
            marginTop: -Settings.CARD_PADDING,
            marginBottom: -Settings.CARD_PADDING,
          }}
        >
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              // margin: Settings.CARD_PADDING,
              marginBottom: -Settings.CARD_PADDING,
            }}
          >
            <Image
              style={{
                width: 62,
                height: 62,
                borderRadius: Settings.BORDER_RADIUS,
              }}
              source={appIcon}
            />
            <Text
              style={[
                fonts.title,
                {
                  marginTop: Settings.CARD_PADDING * 2,
                  // textTransform: 'uppercase',
                },
              ]}
              numberOfLines={1}
            >
              {title ||
                `Métricas de ${AmbitoDolar.getCapitalized(currentMonth)}`}
            </Text>
          </View>
          <>
            <StatView
              {...{
                title: 'Interacciones',
                prev: events[0],
                current: events[1],
                change: events[2],
              }}
            />
            <StatView
              {...{
                title: 'Nuevos usuarios',
                prev: users[0],
                current: users[1],
                change: users[2],
              }}
            />
            <StatView
              {...{
                title: 'Conversiones',
                prev: conversions[0],
                current: conversions[1],
                change: conversions[2],
              }}
            />
          </>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              // margin: Settings.CARD_PADDING,
              paddingHorizontal: Settings.PADDING,
              marginTop: -Settings.CARD_PADDING,
            }}
          >
            <Text
              style={[
                fonts.callout,
                {
                  color: Settings.getGrayColor(theme),
                  textAlign: 'center',
                },
              ]}
            >
              {/* Esta aplicación es gratuita, de código abierto y sin publicidades,
            opera de forma totalmente transparente y comparte sus métricas con
            la comunidad. Tu contribución es de suma importancia para su
            desarrollo y mantenimiento.*/}
              Esta aplicación es gratuita, de código abierto y sin publicidades,
              recordamos que tu contribución es de suma importancia para su
              desarrollo y mantenimiento.
            </Text>
            <FundingView
              style={[
                fonts.title,
                {
                  paddingTop: Settings.PADDING,
                  // textTransform: 'uppercase',
                  // marginVertical: Settings.CARD_PADDING * 2,
                },
              ]}
            />
            {false && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: Settings.PADDING,
                }}
              >
                <SocialView />
              </View>
            )}
          </View>
        </View>
      </SocialPortraitView>
    );
  }
);

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

const FundingView = ({ style }) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <Text
      style={[
        fonts.body,
        {
          color: Settings.getGrayColor(theme),
        },
        style,
      ]}
      numberOfLines={1}
    >
      {Helper.removeProtocol(Settings.CAFECITO_URL)}
    </Text>
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
  const rates = Helper.getAvailableRates(data?.rates);
  const hasRates = React.useMemo(() => Helper.isValid(rates), [rates]);
  return (
    <>
      {rates ? (
        hasRates ? (
          <Component
            {...{
              rates,
              processedAt: data.processed_at,
              ...props,
            }}
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

const RatesContainer = compose(withRates)(({ title, rates, processedAt }) => {
  const { theme, fonts } = Helper.useTheme();
  const rateTypes = React.useMemo(
    () => Object.keys(rates) /*.slice(0, -1)*/,
    [rates]
  );
  const rows = React.useMemo(
    () => _.chunk(rateTypes, LAYOUT_RATE_COLUMNS),
    [rateTypes]
  );
  const condensed = rows.length > 4;
  const getItemView = React.useCallback(
    (type) => (
      <RateView
        {...{
          key: type,
          type,
          stats: rates[type].stats,
          large: true,
          condensed,
        }}
      />
    ),
    [rates, condensed]
  );
  return (
    <SocialPortraitView>
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
              marginTop: Settings.SMALL_PADDING * (condensed === true ? 1 : 2),
            },
          ]}
          numberOfLines={1}
        >
          {DateUtils.humanize(processedAt, 2)}
        </Text>
      </View>
      {/* two columns layout */}
      {rows.map((types, index) => {
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
            {types.length < LAYOUT_RATE_COLUMNS && (
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
      {rateTypes.length % LAYOUT_RATE_COLUMNS === 0 && (
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
    </SocialPortraitView>
  );
});

const AppContainer = () => {
  const params = new URLSearchParams(document.location.search);
  const { type, ...data } = Object.fromEntries(params);
  if (type === 'funding') {
    return <FundingContainer {...data} />;
  }
  return <RatesContainer {...data} />;
};

export default compose(withContainer())(AppContainer);
