import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { Platform } from 'react-native';
import { useDispatch } from 'react-redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import FixedScrollView from '../components/FixedScrollView';
import withContainer from '../components/withContainer';
import withDividersOverlay from '../components/withDividersOverlay';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';
import Sentry from '../utilities/Sentry';

const DeveloperScreen = ({ headerHeight, tabBarheight, navigation }) => {
  const dispatch = useDispatch();
  const [, setAppDonationModal] = Helper.useSharedState('appDonationModal');
  return (
    <FixedScrollView
      {...{
        headerHeight,
        tabBarheight,
      }}
    >
      <CardView title="Acciones" plain>
        {false && (
          <CardItemView
            title="Invalidar versión"
            useSwitch={false}
            chevron={false}
            onAction={() => {
              dispatch(actions.forceApplicationInvalidVersion());
            }}
          />
        )}
        <CardItemView
          title="Limpiar almacenamiento"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            dispatch(actions.clearStore());
          }}
        />
        <CardItemView
          title="Limpiar cotizaciones"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            dispatch(actions.clearRates());
          }}
        />
        <CardItemView
          title="Ver cotizaciones"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            navigation.navigate('RatesTab', {
              screen: Settings.INITIAL_ROUTE_NAME,
            });
          }}
        />
        <CardItemView
          title="Ver conversor"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            navigation.navigate('ConversionTab', {
              // https://reactnavigation.org/docs/params/#passing-params-to-nested-navigators
              screen: 'Conversion',
              params: {
                // TODO: send focus flag or leave as it ???
                focus: false,
              },
            });
          }}
        />
        <CardItemView
          title="Simular excepción"
          useSwitch={false}
          chevron={false}
          onAction={Sentry.nativeCrash}
          /* onAction={() => {
            throw new Error('Intentional excepción');
          }} */
        />
        <CardItemView
          title="Ver modal de donación"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            // force open at every change of value
            setAppDonationModal(Date.now());
          }}
        />
      </CardView>
      {Platform.OS === 'android' && (
        <CardView title="Widgets" plain>
          <CardItemView
            title="Cotizaciones"
            useSwitch={false}
            chevron={false}
            onAction={() => {
              navigation.navigate('RateWidgetPreview');
            }}
          />
        </CardView>
      )}
    </FixedScrollView>
  );
};

export default compose(withContainer(), withDividersOverlay)(DeveloperScreen);
