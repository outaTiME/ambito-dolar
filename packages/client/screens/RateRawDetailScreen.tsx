// @ts-nocheck
import AmbitoDolar from '@ambito-dolar/core';
import { useLocalSearchParams } from 'expo-router';
import * as _ from 'lodash';
import React from 'react';
import { shallowEqual, useSelector } from 'react-redux';

import CardItemView from '@/components/CardItemView';
import FixedFlatList from '@/components/FixedFlatList';
import withContainer from '@/components/withContainer';
import { getKind } from '@/config/kinds';
import Settings from '@/config/settings';
import DateUtils from '@/utilities/Date';
import Helper from '@/utilities/Helper';

// fonts.body + fonts.footnote (lineheight)
/* const ITEM_HEIGHT = Math.round(
  Settings.PADDING * 2 + 22 + Settings.SMALL_PADDING + 18
); */
const ITEM_HEIGHT = Settings.PADDING * 2 + 22 + Settings.SMALL_PADDING + 18;

const formatRateValue = (value) => Helper.getInlineRateValue(value);

const formatRateDate = (timestamp, style) =>
  DateUtils.humanize(timestamp, style);

const formatRateChange = (stat) => AmbitoDolar.getRateChange(stat[2], true);

// markets bring their own formats and color sense, rates keep these
const RateRawDetailItem = ({
  stat,
  formatValue = formatRateValue,
  formatDate = formatRateDate,
  formatRowChange = formatRateChange,
  inverse = false,
}) => {
  const { theme } = Helper.useTheme();
  const change = stat[2];
  return (
    <CardItemView
      title={formatValue(stat[1])}
      titleDetail={formatDate(stat[0], 5)}
      useSwitch={false}
      value={formatRowChange(stat)}
      valueStyle={{
        color: Helper.getChangeColor(inverse ? -change : change, theme),
      }}
      containerStyle={
        {
          // fixed item size
          // height: ITEM_HEIGHT,
        }
      }
      titleContainerStyle={
        {
          // paddingVertical: Settings.PADDING / 2,
        }
      }
    />
  );
};

// no stats keeps the hooks running until the redirect lands
const EMPTY_STATS = [];

const RateRawDetailScreen = ({ kind }) => {
  const { useItems, excludedKey, goToRoot } = getKind(kind);
  const rates = useItems();
  const params = useLocalSearchParams();
  const type = params?.type as string;
  const rangeIndex = Number(params?.rangeIndex || 0);
  const rate = React.useMemo(() => rates?.[type], [rates, type]);
  const viewProps = React.useMemo(
    () => getKind(kind).getViewProps(type),
    [kind, type],
  );
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
  const prev_historical_rates = Helper.usePrevious(historical_rates);
  const chartStats = React.useMemo(() => {
    // the historical is dropped on a rate change, hold the previous one meanwhile
    const current_historical_rates = historical_rates || prev_historical_rates;
    if (current_historical_rates && rangeIndex > 0) {
      const stats = current_historical_rates[type] || [];
      if (stats.length > 0) {
        // compare in market days, a midnight stamp shifts a day on a phone west of buenos aires
        const moment_to = AmbitoDolar.getTimezoneDate(
          stats[stats.length - 1][0],
        );
        // same ranges as the detail that opened this one, a deep link past them takes the widest
        const ranges = getKind(kind).getRanges(type);
        const moment_from = (ranges[rangeIndex] ?? _.last(ranges)).from(
          moment_to,
          AmbitoDolar.getTimezoneDate(stats[0][0]),
        );
        return stats.filter(([timestamp]) =>
          AmbitoDolar.getTimezoneDate(timestamp).isBetween(
            moment_from,
            moment_to,
            'day',
            '[]',
          ),
        );
      } else {
        if (__DEV__) {
          console.warn(`No historical stats for ${type} rate`);
        }
      }
    }
    return base_stats;
  }, [kind, rangeIndex, historical_rates, type, base_stats]);
  const title = React.useMemo(
    () =>
      chartStats.length > 0
        ? DateUtils.formatRange(
            chartStats[0][0],
            chartStats[chartStats.length - 1][0],
          )
        : undefined,
    [chartStats],
  );
  // reverse the order and normalize
  const data = React.useMemo(
    () =>
      _.orderBy(
        // the previous point closes the difference, the history keeps no close of its own
        chartStats.map((stat, index) => [
          stat[0],
          stat[1],
          stat[2],
          chartStats[index - 1]?.[1] ?? stat[3],
        ]),
        ([timestamp]) => new Date(timestamp).getTime(),
        ['desc'],
      ).map((stat) => ({
        component: <RateRawDetailItem {...viewProps} stat={stat} />,
      })),
    [chartStats, viewProps],
  );
  if (!rate) {
    return null;
  }
  return (
    <FixedFlatList
      {...{
        title,
        data,
        itemHeight: ITEM_HEIGHT,
      }}
    />
  );
};

export default withContainer(RateRawDetailScreen);
