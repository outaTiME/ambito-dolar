import React from 'react';

import Helper from '../utilities/Helper';

export default (customized) => (Component) => (props) => {
  const rates = Helper.useRates(customized);
  const rateTypes = React.useMemo(() => Object.keys(rates || {}), [rates]);
  return (
    <Component
      {...{
        ...props,
        rates,
        rateTypes,
      }}
    />
  );
};
