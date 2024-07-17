import AmbitoDolar from '@ambito-dolar/core';
import { compose } from '@reduxjs/toolkit';
import * as _ from 'lodash';
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import AppIconView from './AppIconView';
import WatermarkOverlayView from './WatermarkOverlayView';
import CardView from '../components/CardView';
import FundingView from '../components/FundingView';
import MessageView from '../components/MessageView';
import RateView from '../components/RateView';
import SocialView from '../components/SocialView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const LAYOUT_RATE_COLUMNS = 2;

const SocialPortraitView = ({
  condensed,
  square,
  watermark = true,
  children,
}) => {
  const { theme } = Helper.useTheme();
  const isSquare = square === true;
  return (
    <>
      <View
        style={[
          {
            padding: Settings.CARD_PADDING * (condensed === true ? 1 : 1.5),
            alignSelf: 'center',
            // fixed size required by social notifier
            width: AmbitoDolar.VIEWPORT_PORTRAIT_WIDTH,
            height: isSquare
              ? AmbitoDolar.VIEWPORT_PORTRAIT_WIDTH
              : AmbitoDolar.VIEWPORT_PORTRAIT_HEIGHT,
          },
          __DEV__ && {
            borderColor: Settings.getSeparatorColor(theme),
            borderStyle: 'dashed',
            borderRadius: Settings.BORDER_RADIUS,
            borderWidth: 1,
          },
        ]}
      >
        {children}
      </View>
      {watermark === true && <WatermarkOverlayView />}
    </>
  );
};

const withStats =
  (Component) =>
  ({ earlier, ...props }) => {
    const { theme } = Helper.useTheme();
    const [stats, setStats] = React.useState();
    React.useEffect(() => {
      Helper.getStats(earlier)
        .then(setStats)
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
                ...props,
                ...stats,
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
    [change, theme],
  );
  const change_fmt = React.useMemo(
    () => AmbitoDolar.getRateChange(change, true),
    [change],
  );
  return (
    <CardView>
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
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
            {AmbitoDolar.formatNumberHumanized(current)}
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

const FundingContainer = compose(withStats)(({
  title,
  // from stats
  date,
  users,
  events,
  conversions,
}) => {
  const { theme, fonts } = Helper.useTheme();
  const currentMonth = DateUtils.get(date).format('MMMM YYYY');
  return (
    <SocialPortraitView square watermark>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 50,
          marginTop: -Settings.CARD_PADDING,
          marginBottom: -Settings.CARD_PADDING,
          justifyContent: 'space-evenly',
        }}
      >
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: -Settings.CARD_PADDING,
          }}
        >
          <AppIconView />
          <Text
            style={[
              fonts.title,
              {
                marginTop: Settings.CARD_PADDING * 2,
              },
            ]}
            numberOfLines={1}
          >
            {title || `Métricas de ${AmbitoDolar.getCapitalized(currentMonth)}`}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 50,
            justifyContent: 'center',
          }}
        >
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
          {false && (
            <View
              style={{
                margin: Settings.CARD_PADDING * 2,
                marginBottom: Settings.CARD_PADDING,
                backgroundColor: Settings.getSeparatorColor(theme),
                height: StyleSheet.hairlineWidth,
                width: 100,
                alignSelf: 'center',
              }}
            />
          )}
        </View>
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
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
            {`${Settings.APP_NAME} opera de forma transparente compartiendo sus métricas mensuales con la comunidad.`}
          </Text>
          {false && (
            <FundingView
              style={[
                {
                  paddingTop: Settings.PADDING,
                },
              ]}
            />
          )}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: Settings.CARD_PADDING * 2,
            }}
          >
            <SocialView />
          </View>
        </View>
      </View>
    </SocialPortraitView>
  );
});

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
    [rates],
  );
  const rows = React.useMemo(
    () => _.chunk(rateTypes, LAYOUT_RATE_COLUMNS),
    [rateTypes],
  );
  const condensed = rows.length > 4;
  const showFooter = rateTypes.length % LAYOUT_RATE_COLUMNS === 0;
  const smallPadding = showFooter;
  const getItemView = React.useCallback(
    (type) => (
      <RateView
        {...{
          key: type,
          type,
          stats: rates[type].stats,
          large: true,
          condensed,
          smallPadding,
        }}
      />
    ),
    [rates, condensed, smallPadding],
  );
  return (
    <SocialPortraitView {...{ condensed }}>
      <View
        style={{
          marginVertical: Settings.CARD_PADDING,
          marginHorizontal:
            Settings.CARD_PADDING * (condensed === true ? 1 : 1.5),
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flex: 1,
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
                marginTop:
                  Settings.SMALL_PADDING *
                  (condensed === true || smallPadding === true ? 1 : 2),
              },
            ]}
            numberOfLines={1}
          >
            {DateUtils.humanize(processedAt, 2)}
          </Text>
        </View>
        {false && <AppIconView />}
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
                  margin:
                    Settings.CARD_PADDING * (condensed === true ? 1 : 1.5),
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
      {showFooter && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginVertical: Settings.CARD_PADDING,
            marginHorizontal:
              Settings.CARD_PADDING * (condensed === true ? 1 : 1.5),
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
