// @ts-nocheck
import { compose } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';

import * as actions from '@/actions';
import CardItemView from '@/components/CardItemView';
import CardView from '@/components/CardView';
import FixedScrollView from '@/components/FixedScrollView';
import withContainer from '@/components/withContainer';
import Helper from '@/utilities/Helper';
import { goToConversion, goToRatesWithPopToTop } from '@/utilities/Navigation';

const DeveloperScreen = () => {
  const dispatch = useDispatch();
  const [, setAppDonationModal] = Helper.useSharedState('appDonationModal');
  const showActivityToast = Helper.useActivityToast();
  return (
    <FixedScrollView>
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
            goToRatesWithPopToTop();
          }}
        />
        <CardItemView
          title="Ver conversor"
          useSwitch={false}
          chevron={false}
          onAction={() => {
            goToConversion();
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
    </FixedScrollView>
  );
};

export default compose(withContainer)(DeveloperScreen);
