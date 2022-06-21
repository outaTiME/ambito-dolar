import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { useDispatch } from 'react-redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import ScrollView from '../components/ScrollView';
import withContainer from '../components/withContainer';
import Settings from '../config/settings';

const DeveloperScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  return (
    <ScrollView>
      <CardView title="Acciones" plain>
        <CardItemView
          title="Invalidar versión"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            dispatch(actions.forceApplicationInvalidVersion());
          }}
        />
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
      </CardView>
    </ScrollView>
  );
};

export default compose(withContainer())(DeveloperScreen);
