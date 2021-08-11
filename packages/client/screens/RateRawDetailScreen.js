import _ from 'lodash';
import React from 'react';
import { useSelector } from 'react-redux';
import { compose } from 'redux';

import CardItemView from '../components/CardItemView';
import FlatList from '../components/FlatList';
import withContainer from '../components/withContainer';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const ITEM_HEIGHT = Settings.PADDING * 2 + 22 + 2 + 18; // fonts.body + fonts.footnote (lineheight)

const RateRawDetailItem = ({ timestamp, value, change }) => {
  const { theme } = Helper.useTheme();
  return (
    <CardItemView
      title={Helper.getInlineRateValue(value)}
      titleDetail={DateUtils.datetime(timestamp)}
      useSwitch={false}
      value={Helper.getChange(change)}
      valueStyle={{
        color: Helper.getChangeColor(change, theme),
      }}
    />
  );
};

const RateRawDetailScreen = ({ route: { params } }) => {
  const rates = useSelector((state) => state.rates.rates);
  const { type, rangeIndex } = params;
  const rate = React.useMemo(() => rates[type], [rates, type]);
  const base_stats = rate.stats;
  const historical_rates = useSelector(
    (state) => state.rates?.historical_rates
  );
  const prev_historical_rates = Helper.usePrevious(historical_rates);
  const chartStats = React.useMemo(() => {
    // prevent back and forth on chart when revalidation
    const current_historical_rates = historical_rates || prev_historical_rates;
    if (current_historical_rates && (rangeIndex === 1 || rangeIndex === 2)) {
      const stats = current_historical_rates[type] || [];
      if (stats.length > 0) {
        const moment_to = DateUtils.get(stats[stats.length - 1][0]);
        const moment_from =
          rangeIndex === 1
            ? moment_to.clone().subtract(1, 'month')
            : DateUtils.get(stats[0][0]);
        return stats.filter(([timestamp]) =>
          DateUtils.get(timestamp).isBetween(
            moment_from,
            moment_to,
            'day',
            '[]'
          )
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
        chartStats[chartStats.length - 1][0]
      ),
    [chartStats]
  );
  // reverse the order and normalize
  const data = React.useMemo(
    () =>
      _.orderBy(chartStats, ([timestamp]) => new Date(timestamp).getTime(), [
        'desc',
      ]).map(([timestamp, value, change], index) => ({
        id: `stat_${type}_${index}`,
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
    [chartStats]
  );
  return (
    <FlatList
      {...{
        title,
        data,
        itemHeight: ITEM_HEIGHT,
      }}
    />
  );
};

export default compose(withContainer())(RateRawDetailScreen);
