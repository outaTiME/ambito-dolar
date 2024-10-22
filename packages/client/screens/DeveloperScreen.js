import { tx, id } from '@instantdb/react-native';
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
import DateUtils from '../utilities/Date';
import Helper from '../utilities/Helper';

const DeveloperScreen = ({ headerHeight, tabBarheight, navigation }) => {
  const dispatch = useDispatch();
  const [, setAppDonationModal] = Helper.useSharedState('appDonationModal');
  const showActivityToast = Helper.useActivityToast();
  return (
    <FixedScrollView
      {...{
        headerHeight,
        tabBarheight,
      }}
    >
      <CardView title="Acciones" plain>
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
          // onAction={Sentry.nativeCrash}
          onAction={() => Helper.forceException()}
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
        <CardItemView
          title="Ver toast de actividad"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            showActivityToast('Toast de actividad');
          }}
        />
      </CardView>
      <CardView title="InstantDB" plain>
        <CardItemView
          title="Crear nuevo tablero"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            const db = Helper.getInstantDB();
            const boardId = id();
            const data = {
              // empty
            };
            const updated_at = DateUtils.get();
            db.transact([
              tx.boards[boardId].update({ data, updated_at }),
            ]).catch(console.warn);
          }}
        />
        <CardItemView
          title="Eliminar tablero existente"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            const db = Helper.getInstantDB();
            db.queryOnce({
              boards: {
                $: {
                  // avoid fixed record identifier
                  limit: 1,
                },
              },
            })
              .then(({ data }) => {
                const boardId = data?.boards?.[0]?.id;
                if (boardId) {
                  return db.transact(tx.boards[boardId].delete());
                }
                throw new Error('No board found');
              })
              .catch(console.warn);
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
