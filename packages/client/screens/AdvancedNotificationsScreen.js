import AmbitoDolar from '@ambito-dolar/core';
import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import FixedScrollView from '../components/FixedScrollView';
import withContainer from '../components/withContainer';
import withRates from '../components/withRates';
import I18n from '../config/I18n';
import Helper from '../utilities/Helper';

const AdvancedNotificationsScreen = ({
  headerHeight,
  tabBarHeight,
  // rates,
  rateTypes,
  route: { params },
}) => {
  const dispatch = useDispatch();
  const notification_settings = useSelector(
    Helper.getNotificationSettingsSelector,
  );
  const onValueChange = React.useCallback(
    (type, value) => {
      const settings = Helper.getNotificationSettings(
        notification_settings,
        {
          rates: {
            [type]: value,
          },
        },
        params.type,
      );
      dispatch(actions.updateNotificationSettings(settings));
    },
    [params, notification_settings],
  );
  const getItemView = React.useCallback(
    (type) => {
      const settings = notification_settings[params.type];
      // legacy support for saved settings on local store
      const value =
        type === AmbitoDolar.CCL_TYPE
          ? settings.rates[AmbitoDolar.CCL_LEGACY_TYPE] !== false &&
            settings.rates[AmbitoDolar.CCL_TYPE] === true
          : settings.rates[type];
      return (
        <CardItemView
          key={type}
          title={AmbitoDolar.getRateTitle(type)}
          value={value}
          onValueChange={(value) => {
            onValueChange(type, value);
          }}
        />
      );
    },
    [params, notification_settings],
  );
  return (
    <FixedScrollView
      {...{
        headerHeight,
        tabBarHeight,
      }}
    >
      <CardView
        // title={I18n.t('opts_rates')}
        note={I18n.t('notification_choose_rates_note')}
        plain
      >
        {rateTypes.map((type) => getItemView(type))}
      </CardView>
    </FixedScrollView>
  );
};

export default compose(withContainer, withRates())(AdvancedNotificationsScreen);
