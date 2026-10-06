// @ts-nocheck
import AmbitoDolar from '@ambito-dolar/core';
import { compose } from '@reduxjs/toolkit';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import * as actions from '@/actions';
import CardItemView from '@/components/CardItemView';
import CardView from '@/components/CardView';
import FixedScrollView from '@/components/FixedScrollView';
import withContainer from '@/components/withContainer';
import withRates from '@/components/withRates';
import I18n from '@/config/I18n';
import Helper from '@/utilities/Helper';

const AdvancedNotificationsScreen = ({
  // rates,
  rateTypes,
}) => {
  const params = useLocalSearchParams();
  const paramType = params?.type as string;
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
        paramType,
      );
      // the legacy key would keep ccl off whatever the switch says
      if (type === AmbitoDolar.CCL_TYPE) {
        delete settings[paramType].rates[AmbitoDolar.CCL_LEGACY_TYPE];
      }
      dispatch(actions.updateNotificationSettings(settings));
    },
    [paramType, notification_settings, dispatch],
  );
  const getItemView = React.useCallback(
    (type) => {
      const value = AmbitoDolar.isNotificationRateEnabled(
        notification_settings[paramType],
        type,
      );
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
    [paramType, notification_settings, onValueChange],
  );
  return (
    <FixedScrollView>
      <CardView note={I18n.t('notification_choose_rates_note')} plain>
        {rateTypes.map((type) => getItemView(type))}
      </CardView>
    </FixedScrollView>
  );
};

export default compose(withContainer, withRates())(AdvancedNotificationsScreen);
