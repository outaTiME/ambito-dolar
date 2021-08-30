import React from 'react';
import { useDispatch } from 'react-redux';
import { compose } from 'redux';

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
          title="Limpiar store"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            dispatch(actions.clearStore());
          }}
        />
        <CardItemView
          title="Version inválida"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            dispatch(actions.forceApplicationInvalidVersion());
          }}
        />
        <CardItemView
          title="Visualizar cotizaciones"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            navigation.navigate(Settings.INITIAL_ROUTE_NAME, {
              screen: 'Rates',
              /* params: {
                screen: 'Rates',
              }, */
            });
          }}
        />
      </CardView>
    </ScrollView>
  );
};

export default compose(withContainer())(DeveloperScreen);
