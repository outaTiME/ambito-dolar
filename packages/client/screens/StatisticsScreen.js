import React from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { compose } from 'redux';

import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import ScrollView from '../components/ScrollView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const StatisticsScreen = () => {
  const [installationTime] = Helper.useSharedState('installationTime');
  const { daysUsed, conversions } = useSelector(
    ({ application: { days_used: daysUsed, conversions } }) => ({
      daysUsed,
      conversions,
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
            value={DateUtils.datetime(installationTime, { short: true })}
          />
        )}
        <CardItemView
          title={I18n.t('app_days_used')}
          useSwitch={false}
          value={Helper.formatIntegerNumber(daysUsed ?? 0)}
        />
        <CardItemView
          title={I18n.t('app_conversions')}
          useSwitch={false}
          value={Helper.formatIntegerNumber(conversions ?? 0)}
        />
      </CardView>
    </ScrollView>
  );
};

export default compose(withContainer())(StatisticsScreen);
