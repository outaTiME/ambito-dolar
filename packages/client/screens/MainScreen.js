import AmbitoDolar from '@ambito-dolar/core';
import React from 'react';
import { useSelector } from 'react-redux';
import { compose } from 'redux';

import RateView from '../components/RateView';
import withContainer from '../components/withContainer';
import withScreenshotShareSheet from '../components/withScreenshotShareSheet';

const MainScreen = ({ navigation }) => {
  const onRateSelected = React.useCallback(
    (type) => navigation.navigate('RateDetail', { type }),
    []
  );
  const rateTypes = AmbitoDolar.getAvailableRateTypes();
  const rates = useSelector((state) => state.rates?.rates);
  const getItemView = React.useCallback(
    (type) => (
      <RateView
        {...{
          key: type,
          type,
          stats: rates[type].stats,
          onSelected: onRateSelected,
        }}
      />
    ),
    [rates]
  );
  return <>{rateTypes.map((type) => getItemView(type))}</>;
};

export default compose(
  withContainer,
  // withScreenshotShareSheet('Compartir cotizaciones')
  withScreenshotShareSheet
)(MainScreen);
