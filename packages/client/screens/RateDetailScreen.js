import React from 'react';
import { View, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { compose } from 'redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import SegmentedControlTab from '../components/SegmentedControlTab';
import VictoryRateChartView from '../components/VictoryRateChartView';
import withContainer from '../components/withContainer';
import withScreenshotShareSheet from '../components/withScreenshotShareSheet';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const RANGE_TYPES = ['Semana', 'Mes', 'Año'];

const RateDetailScreen = ({ route: { params }, navigation }) => {
  const [rangeIndex, setRangeIndex] = React.useState(0);
  const prev_rangeIndex = Helper.usePrevious(rangeIndex);
  const rates = useSelector((state) => state.rates?.rates);
  const { type } = params;
  const rate = React.useMemo(() => rates[type], [rates, type]);
  const base_stats = rate.stats;
  const prev_base_stats = Helper.usePrevious(base_stats);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const historical_rates = useSelector(
    (state) => state.rates?.historical_rates
  );
  const prev_historical_rates = Helper.usePrevious(historical_rates);
  const updateHistoricalRates = React.useCallback(async () => {
    const rates = await Helper.getHistoricalRates();
    dispatch(actions.updateHistoricalRates(rates));
  }, []);
  const [chartStats, setChartStats] = React.useState(base_stats);
  React.useEffect(() => {
    // ignore initial
    if (prev_rangeIndex !== undefined) {
      // debounce data updates
      const timer_id = setTimeout(() => {
        // prevent back and forth on chart when revalidation
        const current_historical_rates =
          historical_rates || prev_historical_rates;
        if (
          current_historical_rates &&
          (rangeIndex === 1 || rangeIndex === 2)
        ) {
          const stats = current_historical_rates[type] || [];
          if (stats.length > 0) {
            const moment_to = DateUtils.get(stats[stats.length - 1][0]);
            const moment_from =
              rangeIndex === 1
                ? moment_to.clone().subtract(1, 'month')
                : DateUtils.get(stats[0][0]);
            setChartStats(
              stats.filter(([timestamp]) =>
                DateUtils.get(timestamp).isBetween(
                  moment_from,
                  moment_to,
                  'day',
                  '[]'
                )
              )
            );
          } else {
            if (__DEV__) {
              console.warn(`No historical stats for ${type} rate.`);
            }
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
    if (must_revalidate && (rangeIndex === 1 || rangeIndex === 2)) {
      updateHistoricalRates();
    }
  }, [base_stats, rangeIndex]);
  // update data on charts
  React.useEffect(() => {
    const range_updated =
      prev_rangeIndex !== undefined && prev_rangeIndex !== rangeIndex;
    if (
      range_updated &&
      (rangeIndex === 1 || rangeIndex === 2) &&
      !historical_rates
    ) {
      setLoading(true);
      // wait at least ANIMATION_DURATION before request to prevent fast dialogs on fails
      Helper.delay(Settings.ANIMATION_DURATION).then(() =>
        Helper.getHistoricalRates()
          .then((rates) => {
            dispatch(actions.updateHistoricalRates(rates));
          })
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
              }
            );
          })
          .finally(() => {
            setLoading(false);
          })
      );
    }
  }, [rangeIndex, historical_rates]);
  const onRawDetail = React.useCallback(
    () => navigation.navigate('RateRawDetail', { type, rangeIndex }),
    [type, rangeIndex]
  );
  const onTabPress = React.useCallback((index) => {
    setRangeIndex(index);
  }, []);
  return (
    <>
      <SegmentedControlTab
        values={RANGE_TYPES}
        selectedIndex={rangeIndex}
        onTabPress={onTabPress}
        enabled={loading === false}
      />
      <CardView style={{ flex: 1 }} plain>
        <View
          style={[
            {
              flexGrow: 1,
              minHeight: 310,
              padding: Settings.PADDING,
            },
          ]}
        >
          <VictoryRateChartView stats={chartStats} />
        </View>
        <CardItemView
          title="Mostrar detalle"
          useSwitch={false}
          onAction={onRawDetail}
        />
      </CardView>
      <CardView title="Resumen de jornada" plain>
        <CardItemView
          title="Variación"
          useSwitch={false}
          value={Helper.getCurrency(
            Helper.getRateValue(base_stats[base_stats.length - 1]) -
              Helper.getRateValue(base_stats[base_stats.length - 2])
          )}
        />
        <CardItemView
          title="Cierre anterior"
          useSwitch={false}
          value={Helper.getCurrency(
            Helper.getRateValue(base_stats[base_stats.length - 2])
          )}
        />
      </CardView>
      {rate.max && (
        <CardView plain>
          <CardItemView
            title="Máximo histórico"
            titleDetail={DateUtils.date(rate.max_date)}
            useSwitch={false}
            value={Helper.getCurrency(rate.max)}
          />
        </CardView>
      )}
      <CardView title="Fuente" plain>
        <CardItemView title={rate.provider} useSwitch={false} />
      </CardView>
    </>
  );
};

export default compose(
  withContainer,
  // withScreenshotShareSheet('Compartir cotización')
  withScreenshotShareSheet
)(RateDetailScreen);
