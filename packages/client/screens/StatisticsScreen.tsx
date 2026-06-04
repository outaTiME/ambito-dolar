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
import { useDonationProducts } from '@/hooks/useDonationProducts';
import DateUtils from '@/utilities/Date';
import { computeLifetime } from '@/utilities/Donation';
import Helper from '@/utilities/Helper';

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
    shallowEqual,
  );
  const [lastDonation, setLastDonation] = React.useState(null);
  const [transactions, setTransactions] = React.useState([]);
  const { priceMap } = useDonationProducts();
  const lifetimeTotal = React.useMemo(
    () => computeLifetime(transactions, priceMap),
    [transactions, priceMap],
  );
  const avgDailyOpens = React.useMemo(
    () => (daysUsed > 0 ? usages / daysUsed : 0),
    [usages, daysUsed],
  );
  const applyCustomerInfo = React.useCallback((customerInfo) => {
    const tx = customerInfo?.nonSubscriptionTransactions ?? [];
    const lastTransaction = tx[tx.length - 1];
    setTransactions(tx);
    setLastDonation(lastTransaction?.purchaseDate ?? null);
  }, []);
  const [purchasesConfigured] = Helper.useSharedState(
    'purchasesConfigured',
    false,
  );
  React.useEffect(() => {
    if (!purchasesConfigured) {
      return;
    }
    Purchases.getCustomerInfo().then(applyCustomerInfo).catch(console.warn);
    Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
    return () => Purchases.removeCustomerInfoUpdateListener(applyCustomerInfo);
  }, [purchasesConfigured, applyCustomerInfo]);
  return (
    <FixedScrollView>
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
      {purchasesConfigured && (
        <CardView title={I18n.t('app_donations')} plain>
          <CardItemView
            title={I18n.t('app_donations_count')}
            useSwitch={false}
            value={Helper.formatIntegerNumber(transactions.length)}
          />
          <CardItemView
            title={I18n.t('app_donations_amount')}
            useSwitch={false}
            value={Helper.getCurrency(lifetimeTotal, true, true)}
          />
          {lastDonation && (
            <CardItemView
              title={I18n.t('app_last_donation')}
              useSwitch={false}
              value={DateUtils.humanize(lastDonation)}
            />
          )}
        </CardView>
      )}
    </FixedScrollView>
  );
};

export default compose(withContainer)(StatisticsScreen);
