import React from 'react';
import { Platform } from 'react-native';

import Helper from '../utilities/Helper';

export default (customized) => (Component) => (props) => {
  const rates = Helper.useRates(customized);
  const rateTypes = React.useMemo(() => Object.keys(rates || {}), [rates]);
  const contentHeight = props?.contentHeight;
  const shoudStretch = React.useMemo(() => {
    if (!contentHeight || Platform.OS === 'web') {
      return true;
    }
    // rate height ~100px
    const ratesPerPage = Math.floor(contentHeight / 100);
    // disable stretch if few rates
    return rateTypes?.length >= ratesPerPage;
  }, [rateTypes, contentHeight]);
  return (
    <Component
      {...{
        ...props,
        rates,
        rateTypes,
        shoudStretch,
      }}
    />
  );
};
