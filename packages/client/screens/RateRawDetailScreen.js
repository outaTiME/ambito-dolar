import AmbitoDolar from '@ambito-dolar/core';
import { compose } from '@reduxjs/toolkit';
import * as _ from 'lodash';
import React from 'react';
import { useSelector } from 'react-redux';

import CardItemView from '../components/CardItemView';
import FixedFlatList from '../components/FixedFlatList';
import withContainer from '../components/withContainer';
import withDividersOverlay from '../components/withDividersOverlay';
import withRates from '../components/withRates';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

// fonts.body + fonts.footnote (lineheight)
/* const ITEM_HEIGHT = Math.round(
  Settings.PADDING * 2 + 22 + Settings.SMALL_PADDING + 18
); */
const ITEM_HEIGHT = Settings.PADDING * 2 + 22 + Settings.SMALL_PADDING + 18;

const RateRawDetailItem = ({ timestamp, value, change }) => {
  const { theme } = Helper.useTheme();
  return (
    <CardItemView
      title={Helper.getInlineRateValue(value)}
      titleDetail={DateUtils.humanize(timestamp, 5)}
      useSwitch={false}
      value={AmbitoDolar.getRateChange(change)}
      valueStyle={{
        color: Helper.getChangeColor(change, theme),
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

const RateRawDetailScreen = ({
  headerHeight,
  tabBarheight,
  rates,
  route: { params },
}) => {
  const { type, rangeIndex } = params;
  const rate = React.useMemo(() => rates[type], [rates, type]);
  const base_stats = rate.stats;
  const historical_rates = useSelector((state) => state.rates.historical_rates);
  const prev_historical_rates = Helper.usePrevious(historical_rates);
  const chartStats = React.useMemo(() => {
    // prevent back and forth on chart when revalidation
    const current_historical_rates = historical_rates || prev_historical_rates;
    if (current_historical_rates && rangeIndex > 0) {
      const stats = current_historical_rates[type] || [];
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
        return stats.filter(([timestamp]) =>
          DateUtils.get(timestamp).isBetween(
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
  }, [rangeIndex, historical_rates, type, base_stats]);
  const title = React.useMemo(
    () =>
      DateUtils.formatRange(
        chartStats[0][0],
        chartStats[chartStats.length - 1][0],
      ),
    [chartStats],
  );
  // reverse the order and normalize
  const data = React.useMemo(
    () =>
      _.orderBy(chartStats, ([timestamp]) => new Date(timestamp).getTime(), [
        'desc',
      ]).map(([timestamp, value, change], index) => ({
        component: (
          <RateRawDetailItem
            {...{
              timestamp,
              value,
              change,
            }}
          />
        ),
      })),
    [chartStats],
  );
  return (
    <FixedFlatList
      {...{
        title,
        data,
        itemHeight: ITEM_HEIGHT,
        headerHeight,
        tabBarheight,
      }}
    />
  );
};

export default compose(
  withContainer(),
  withDividersOverlay,
  withRates(),
)(RateRawDetailScreen);
