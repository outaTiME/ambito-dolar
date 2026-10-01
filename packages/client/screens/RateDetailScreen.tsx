// @ts-nocheck
import AmbitoDolar from '@ambito-dolar/core';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View, Alert } from 'react-native';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';

import * as actions from '@/actions';
import CardItemView from '@/components/CardItemView';
import CardView from '@/components/CardView';
import FixedScrollView from '@/components/FixedScrollView';
import SegmentedControlTab from '@/components/SegmentedControl';
import VictoryRateChartView from '@/components/VictoryRateChartView';
import withContainer from '@/components/withContainer';
import withRates from '@/components/withRates';
import I18n from '@/config/I18n';
import { getKind } from '@/config/kinds';
import Settings from '@/config/settings';
import DateUtils from '@/utilities/Date';
import Helper from '@/utilities/Helper';

const SpreadCardItemView = ({ rateType, nominalValue, percentageValue }) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: Settings.SMALL_PADDING,
        // same as CardItemView
        paddingHorizontal: Settings.PADDING,
        paddingVertical: Settings.CARD_PADDING + Settings.SMALL_PADDING,
      }}
    >
      <Text
        style={[
          fonts.body,
          {
            width: '40%',
          },
        ]}
        numberOfLines={1}
      >
        {AmbitoDolar.getRateTitle(rateType)}
      </Text>
      <Text
        style={[
          fonts.body,
          {
            width: '25%',
            color: Settings.getGrayColor(theme),
            textAlign: 'right',
          },
        ]}
        numberOfLines={1}
      >
        {nominalValue}
      </Text>
      <Text
        style={[
          // fonts.subhead,
          fonts.body,
          {
            // same as victory chart header
            width: '35%',
            color: Helper.getChangeColor(percentageValue, theme),
            textAlign: 'right',
          },
        ]}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {AmbitoDolar.getRateChange(percentageValue, true)}
      </Text>
    </View>
  );
};

const Spreads = withRates(true)(({ type, stat, rates, rateTypes }) => {
  const getItemView = React.useCallback(
    (itemType) => {
      if (itemType !== type) {
        const itemStats = rates[itemType]?.stats;
        if (itemStats) {
          const rateValue = AmbitoDolar.getRateValue(stat);
          const itemStat = itemStats[itemStats.length - 1];
          const itemRateValue = AmbitoDolar.getRateValue(itemStat);
          // calculate from open / close rate and truncate
          const rateChangePercent = AmbitoDolar.getNumber(
            (rateValue / itemRateValue - 1) * 100,
          );
          const rateChange = AmbitoDolar.getRateChange(
            [null, rateValue, null, itemRateValue],
            true,
          );
          return (
            <SpreadCardItemView
              {...{
                rateType: itemType,
                nominalValue: rateChange,
                percentageValue: rateChangePercent,
              }}
              key={itemType}
            />
          );
        }
      }
    },
    [type, rates, stat],
  );
  return (
    <CardView title={I18n.t('spreads')} plain>
      {rateTypes.map((type) => getItemView(type))}
    </CardView>
  );
});

// no stats keeps the hooks running until the redirect lands
const EMPTY_STATS = [];

const RateDetailScreen = ({ kind, backgroundColor }) => {
  const {
    useItems,
    excludedKey,
    goToRoot,
    formatValue,
    formatChange,
    hasSpreads,
    refetchOnUpdate,
    summaryTitle,
    previousLabel,
    formatDate,
  } = getKind(kind);
  const rates = useItems();
  const params = useLocalSearchParams();
  const [rangeIndex, setRangeIndex] = React.useState(0);
  const prev_rangeIndex = Helper.usePrevious(rangeIndex);
  const type = params?.type as string;
  // markets bring their own value format and color sense to the chart
  const chartProps = React.useMemo(
    () => getKind(kind).getViewProps(type),
    [kind, type],
  );
  const ranges = getKind(kind).getRanges(type);
  const rangeLabels = React.useMemo(
    () => ranges.map(({ label }) => label),
    [ranges],
  );
  const rate = React.useMemo(() => rates[type], [rates, type]);
  const { historical_rates, excluded_rates } = useSelector(
    ({ rates: { historical_rates }, application }) => ({
      historical_rates,
      excluded_rates: application[excludedKey],
    }),
    shallowEqual,
  );
  React.useEffect(() => {
    if (!type || !rate || (excluded_rates || []).includes(type)) {
      goToRoot();
    }
  }, [excluded_rates, type, rate, goToRoot]);
  const base_stats = rate?.stats ?? EMPTY_STATS;
  const stat = base_stats[base_stats.length - 1];
  const prev_base_stats = Helper.usePrevious(base_stats);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const inFlightRef = React.useRef();
  // both effects can fire on one render, the shared promise keeps it to one
  const updateHistoricalRates = React.useCallback(() => {
    if (!inFlightRef.current) {
      Helper.debug('💫 Fetching historical rates');
      inFlightRef.current = Helper.getHistoricalRates()
        .then((rates) => {
          dispatch(actions.updateHistoricalRates(rates));
          dispatch(actions.registerApplicationDownloadHistoricalRates());
        })
        .finally(() => {
          inFlightRef.current = undefined;
        });
    }
    return inFlightRef.current;
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
              const moment_from = ranges[rangeIndex].from(
                moment_to,
                DateUtils.get(stats[0][0]),
              );
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
          }
        } else {
          setChartStats(base_stats);
        }
      }, Settings.ANIMATION_DURATION);
      return () => clearTimeout(timer_id);
    }
  }, [rangeIndex, historical_rates, type, base_stats, ranges]);
  // re-fetch when the rates moved, the cached one keeps drawing meanwhile
  // markets move on every tick, their history is read once per range
  React.useEffect(() => {
    const must_revalidate =
      refetchOnUpdate &&
      prev_base_stats !== undefined &&
      base_stats !== prev_base_stats;
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
    // per type, a cache from before markets carries rates only
    if (range_updated && rangeIndex > 0 && !historical_rates?.[type]) {
      setLoading(true);
      // wait at least ANIMATION_DURATION before request to prevent fast dialogs on fails
      Helper.delay().then(() =>
        updateHistoricalRates()
          .catch(() => {
            // back to the week, the previous range would fetch again and bounce alerts
            setRangeIndex(0);
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
    () => getKind(kind).goToRawDetail(type, rangeIndex),
    [kind, type, rangeIndex],
  );
  const onTabPress = React.useCallback((index) => {
    setRangeIndex(index);
  }, []);
  if (!stat) {
    return null;
  }
  return (
    <FixedScrollView backgroundColor={backgroundColor}>
      {/* a single stat has nothing to filter, a new market until its next value */}
      {base_stats.length > 1 && (
        <SegmentedControlTab
          values={rangeLabels}
          selectedIndex={rangeIndex}
          onTabPress={onTabPress}
          enabled={loading === false}
          animated
        />
      )}
      <CardView style={{ flex: 1 }} plain>
        <View
          style={[
            {
              flexGrow: 1,
              // the header alone when there is no line to draw
              height:
                chartStats.length > 1 ? Settings.moderateScale(300) : undefined,
              padding: Settings.PADDING,
            },
          ]}
        >
          <VictoryRateChartView
            stats={chartStats}
            formatValue={chartProps?.formatValue}
            inverse={chartProps?.inverse}
            formatDate={chartProps?.formatDate}
            formatChange={chartProps?.formatRowChange}
            formatAxis={chartProps?.formatAxis}
          />
        </View>
        <CardItemView
          title={I18n.t('show_detail')}
          useSwitch={false}
          onAction={onRawDetail}
        />
      </CardView>
      <CardView title={I18n.t(summaryTitle)} plain>
        <CardItemView
          title={I18n.t('variation')}
          useSwitch={false}
          value={formatChange(type, stat)}
        />
        <CardItemView
          title={I18n.t(previousLabel)}
          useSwitch={false}
          value={formatValue(type, stat[3])}
        />
      </CardView>
      {rate.max_date && rate.max != null && (
        <CardView plain>
          <CardItemView
            title={I18n.t('all-time_high')}
            titleDetail={formatDate(type, rate.max_date, 5)}
            useSwitch={false}
            value={formatValue(type, rate.max)}
          />
        </CardView>
      )}
      {hasSpreads && (
        <Spreads
          {...{
            type,
            stat,
          }}
        />
      )}
      <CardView title={I18n.t('source')} plain>
        <CardItemView title={rate.provider} useSwitch={false} />
      </CardView>
    </FixedScrollView>
  );
};

export default withContainer(RateDetailScreen);
