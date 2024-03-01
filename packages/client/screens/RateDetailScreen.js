import AmbitoDolar from '@ambito-dolar/core';
import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { View, Alert } from 'react-native';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import SegmentedControlTab from '../components/SegmentedControl';
import VictoryRateChartView from '../components/VictoryRateChartView';
import withContainer from '../components/withContainer';
import withDividersOverlay from '../components/withDividersOverlay';
import withRates from '../components/withRates';
import withScreenshotShareSheet from '../components/withScreenshotShareSheet';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const RANGE_TYPES = [
  I18n.t('one_week'),
  I18n.t('one_month'),
  I18n.t('three_months'),
  I18n.t('six_months'),
  I18n.t('year'),
  I18n.t('one_year'),
];

const RateDetailScreen = ({ navigation, rates, route: { params } }) => {
  const [rangeIndex, setRangeIndex] = React.useState(0);
  const prev_rangeIndex = Helper.usePrevious(rangeIndex);
  const { type } = params;
  const rate = React.useMemo(() => rates[type], [rates, type]);
  const base_stats = rate.stats;
  const stat = base_stats[base_stats.length - 1];
  const prev_base_stats = Helper.usePrevious(base_stats);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const { historical_rates, excluded_rates } = useSelector(
    ({ rates: { historical_rates }, application: { excluded_rates } }) => ({
      historical_rates,
      excluded_rates,
    }),
    shallowEqual,
  );
  const updateHistoricalRates = React.useCallback(() => {
    if (__DEV__) {
      console.log('💫 Fetching historical rates');
    }
    return Helper.getHistoricalRates().then((rates) => {
      dispatch(actions.updateHistoricalRates(rates));
      dispatch(actions.registerApplicationDownloadHistoricalRates());
    });
  }, [dispatch]);
  const [chartStats, setChartStats] = React.useState(base_stats);
  React.useEffect(() => {
    // ignore initial
    if (prev_rangeIndex !== undefined) {
      // debounce data updates
      const timer_id = setTimeout(() => {
        if (rangeIndex > 0) {
          if (historical_rates) {
            const stats = historical_rates[type] || [];
            if (stats.length > 0) {
              const moment_to = DateUtils.get(stats[stats.length - 1][0]);
              const moment_from =
                rangeIndex === 1
                  ? moment_to.clone().subtract(1, 'month')
                  : rangeIndex === 2
                    ? moment_to.clone().subtract(3, 'months')
                    : rangeIndex === 3
                      ? moment_to.clone().subtract(6, 'months')
                      : rangeIndex === 4
                        ? moment_to.clone().startOf('year')
                        : DateUtils.get(stats[0][0]);
              setChartStats(
                stats.filter(([timestamp]) =>
                  DateUtils.get(timestamp).isBetween(
                    moment_from,
                    moment_to,
                    'day',
                    '[]',
                  ),
                ),
              );
            } else {
              if (__DEV__) {
                console.warn(`No historical stats for ${type} rate`);
              }
            }
          } else {
            // leave the chart with the previous data until the update
          }
        } else {
          setChartStats(base_stats);
        }
      }, Settings.ANIMATION_DURATION);
      return () => clearTimeout(timer_id);
    }
  }, [rangeIndex, historical_rates, type, base_stats]);
  // re-fetch historical rates when focus
  React.useEffect(() => {
    const must_revalidate =
      prev_base_stats !== undefined && base_stats !== prev_base_stats;
    if (must_revalidate && rangeIndex > 0) {
      updateHistoricalRates().catch(() => {
        // silent ignore when error
      });
    }
  }, [base_stats, rangeIndex]);
  // update data on charts
  React.useEffect(() => {
    const range_updated =
      prev_rangeIndex !== undefined && prev_rangeIndex !== rangeIndex;
    if (range_updated && rangeIndex > 0 && !historical_rates) {
      setLoading(true);
      // wait at least ANIMATION_DURATION before request to prevent fast dialogs on fails
      Helper.delay(Settings.ANIMATION_DURATION).then(() =>
        updateHistoricalRates()
          .catch(() => {
            setRangeIndex(prev_rangeIndex);
            Alert.alert(
              I18n.t('detail_loading_error'),
              '',
              [
                {
                  text: I18n.t('accept'),
                  onPress: () => {
                    // pass
                  },
                },
              ],
              {
                cancelable: false,
              },
            );
          })
          .finally(() => {
            setLoading(false);
          }),
      );
    }
  }, [rangeIndex, historical_rates]);
  const onRawDetail = React.useCallback(
    () => navigation.navigate('RateRawDetail', { type, rangeIndex }),
    [type, rangeIndex],
  );
  const onTabPress = React.useCallback((index) => {
    setRangeIndex(index);
  }, []);
  const official_spread = React.useMemo(() => {
    if (type !== AmbitoDolar.OFFICIAL_TYPE) {
      const official_stats = rates[AmbitoDolar.OFFICIAL_TYPE]?.stats;
      if (official_stats) {
        const official_stat = official_stats[official_stats.length - 1];
        const rate_value = AmbitoDolar.getRateValue(stat);
        const official_rate_value = AmbitoDolar.getRateValue(official_stat);
        // calculate from open / close rate and truncate
        /* const rate_change_percent = AmbitoDolar.getNumber(
          (rate_value / official_rate_value - 1) * 100
        ); */
        return AmbitoDolar.getRateChange([
          null,
          rate_value,
          null,
          official_rate_value,
        ]);
      }
    }
  }, [type, rates, stat]);
  // reset when current rate is excluded
  React.useEffect(() => {
    if ((excluded_rates || []).includes(type)) {
      navigation.popToTop();
    }
  }, [excluded_rates]);
  return (
    <>
      <SegmentedControlTab
        values={RANGE_TYPES}
        selectedIndex={rangeIndex}
        onTabPress={onTabPress}
        enabled={loading === false}
        animated
      />
      <CardView style={{ flex: 1 }} plain>
        <View
          style={[
            {
              flexGrow: 1,
              height: Settings.moderateScale(300),
              padding: Settings.PADDING,
            },
          ]}
        >
          <VictoryRateChartView stats={chartStats} />
        </View>
        <CardItemView
          title={I18n.t('show_detail')}
          useSwitch={false}
          onAction={onRawDetail}
        />
      </CardView>
      <CardView title={I18n.t('day_summary')} plain>
        <CardItemView
          title={I18n.t('variation')}
          useSwitch={false}
          value={AmbitoDolar.getRateChange([null, stat[1], null, stat[3]])}
        />
        <CardItemView
          title={I18n.t('previous_close')}
          useSwitch={false}
          value={Helper.getCurrency(stat[3])}
        />
        {official_spread && (
          <CardItemView
            title={I18n.t('spread')}
            useSwitch={false}
            value={official_spread}
          />
        )}
      </CardView>
      {rate.max_date && rate.max && (
        <CardView plain>
          <CardItemView
            title={I18n.t('all-time_high')}
            titleDetail={DateUtils.humanize(rate.max_date, 5)}
            useSwitch={false}
            value={Helper.getCurrency(rate.max)}
          />
        </CardView>
      )}
      <CardView title={I18n.t('source')} plain>
        <CardItemView title={rate.provider} useSwitch={false} />
      </CardView>
    </>
  );
};

export default compose(
  withContainer(),
  withDividersOverlay,
  withRates(),
  withScreenshotShareSheet(),
)(RateDetailScreen);
