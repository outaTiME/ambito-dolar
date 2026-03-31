// @ts-nocheck
import { compose } from '@reduxjs/toolkit';
import React from 'react';
import Purchases from 'react-native-purchases';
import { useSelector, shallowEqual } from 'react-redux';

import CardItemView from '@/components/CardItemView';
import CardView from '@/components/CardView';
import FixedScrollView from '@/components/FixedScrollView';
import withContainer from '@/components/withContainer';
import I18n from '@/config/I18n';
import DateUtils from '@/utilities/Date';
import Helper from '@/utilities/Helper';

const StatisticsScreen = ({ headerHeight, tabBarHeight }) => {
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
    shallowEqual,
  );
  const [Loading, setLoading] = React.useState(true);
  const [donations, setDonations] = React.useState('N/D');
  const [lastDonation, setLastDonation] = React.useState(null);
  const avgDailyOpens = React.useMemo(
    () => (daysUsed > 0 ? usages / daysUsed : 0),
    [usages, daysUsed],
  );
  React.useEffect(() => {
    Helper.promiseRetry((retry) => Purchases.getCustomerInfo().catch(retry))
      .then((customerInfo) => {
        const lastTransaction =
          customerInfo.nonSubscriptionTransactions[
            customerInfo.nonSubscriptionTransactions.length - 1
          ];
        setDonations(
          customerInfo.nonSubscriptionTransactions.length.toString(),
        );
        setLastDonation(lastTransaction?.purchaseDate ?? null);
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);
  React.useEffect(() => {
    const listener = (customerInfo) => {
      const lastTransaction =
        customerInfo.nonSubscriptionTransactions[
          customerInfo.nonSubscriptionTransactions.length - 1
        ];
      setDonations(customerInfo.nonSubscriptionTransactions.length.toString());
      setLastDonation(lastTransaction?.purchaseDate ?? null);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => Purchases.removeCustomerInfoUpdateListener(listener);
  }, []);
  const [purchasesConfigured] = Helper.useSharedState('purchasesConfigured');
  // for purchase listener debugging purposes
  /* const [, setAppDonationModal] = Helper.useSharedState('appDonationModal');
  React.useEffect(() => {
    // force open at every change of value
    setAppDonationModal(Date.now());
  }, []); */
  return (
    <FixedScrollView
      {...{
        headerHeight,
        tabBarHeight,
      }}
    >
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
        {__DEV__ && (
          <CardItemView
            title={I18n.t('app_avg_daily_opens')}
            useSwitch={false}
            value={Helper.formatFloatingPointNumber(avgDailyOpens)}
          />
        )}
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
        {purchasesConfigured && (
          <CardItemView
            title={I18n.t('app_donations')}
            useSwitch={false}
            value={donations}
            loading={Loading}
          />
        )}
        {purchasesConfigured && lastDonation && (
          <CardItemView
            title={I18n.t('app_last_donation')}
            useSwitch={false}
            value={DateUtils.humanize(lastDonation)}
            loading={Loading}
          />
        )}
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
          title={I18n.t('app_detailed_rates')}
          useSwitch={false}
          value={Helper.formatIntegerNumber(detailedRates)}
        />
        <CardItemView
          title={I18n.t('app_downloaded_historical_rates')}
          useSwitch={false}
          value={Helper.formatIntegerNumber(downloadedHistoricalRates)}
        />
      </CardView>
    </FixedScrollView>
  );
};

export default compose(withContainer)(StatisticsScreen);
