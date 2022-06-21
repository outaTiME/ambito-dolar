import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { useSelector, shallowEqual } from 'react-redux';

import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import ScrollView from '../components/ScrollView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const StatisticsScreen = () => {
  const [installationTime] = Helper.useSharedState('installationTime');
  const {
    lastReview,
    usages,
    daysUsed,
    conversions,
    sharedRates,
    downloadedRates,
    downloadedHistoricalRates,
    detailedRates,
  } = useSelector(
    ({
      application: {
        last_review: lastReview,
        usages,
        days_used: daysUsed,
        conversions,
        shared_rates: sharedRates,
        downloaded_rates: downloadedRates,
        downloaded_historical_rates: downloadedHistoricalRates,
        detailed_rates: detailedRates,
      },
    }) => ({
      lastReview,
      usages,
      daysUsed,
      conversions,
      sharedRates,
      downloadedRates,
      downloadedHistoricalRates,
      detailedRates,
    }),
    shallowEqual
  );

  return (
    <ScrollView>
      <CardView title={I18n.t('opts_app')} plain>
        {installationTime && (
          <CardItemView
            title={I18n.t('app_installation_time')}
            useSwitch={false}
            value={DateUtils.humanize(installationTime)}
          />
        )}
        <CardItemView
          title={I18n.t('app_usages')}
          useSwitch={false}
          value={Helper.formatIntegerNumber(usages)}
        />
        <CardItemView
          title={I18n.t('app_days_used')}
          useSwitch={false}
          value={Helper.formatIntegerNumber(daysUsed)}
        />
        <CardItemView
          title={I18n.t('app_conversions')}
          useSwitch={false}
          value={Helper.formatIntegerNumber(conversions)}
        />
        <CardItemView
          title={I18n.t('app_shared_rates')}
          useSwitch={false}
          value={Helper.formatIntegerNumber(sharedRates)}
        />
        {lastReview && (
          <CardItemView
            title={I18n.t('app_last_review')}
            useSwitch={false}
            value={DateUtils.humanize(lastReview)}
          />
        )}
      </CardView>
      <CardView title={I18n.t('opts_rates')} plain>
        <CardItemView
          title={I18n.t('app_downloaded_rates')}
          useSwitch={false}
          value={Helper.formatIntegerNumber(downloadedRates)}
        />
        <CardItemView
          title={I18n.t('app_downloaded_historical_rates')}
          useSwitch={false}
          value={Helper.formatIntegerNumber(downloadedHistoricalRates)}
        />
        <CardItemView
          title={I18n.t('app_detailed_rates')}
          useSwitch={false}
          value={Helper.formatIntegerNumber(detailedRates)}
        />
      </CardView>
    </ScrollView>
  );
};

export default compose(withContainer())(StatisticsScreen);
