import React from 'react';
import { useSelector } from 'react-redux';
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
  const daysUsed = useSelector((state) => state.application.days_used);
  return (
    <ScrollView>
      <CardView title={I18n.t('opts_information')} plain>
        {installationTime && (
          <CardItemView
            title={I18n.t('app_installation_time')}
            useSwitch={false}
            value={DateUtils.datetime(installationTime, { short: true })}
          />
        )}
        {daysUsed && (
          <CardItemView
            title={I18n.t('app_days_used')}
            useSwitch={false}
            value={Helper.formatIntegerNumber(daysUsed)}
          />
        )}
      </CardView>
    </ScrollView>
  );
};

export default compose(withContainer())(StatisticsScreen);
