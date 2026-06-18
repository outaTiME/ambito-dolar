import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import MainScreen from '@/screens/MainScreen';
import { clearRouteParam, dismissToTop } from '@/utilities/Navigation';

const POP_TO_TOP_PARAM = 'popToTop';

const RatesIndexRoute = () => {
  const params = useLocalSearchParams();
  const shouldPopToTop = params?.[POP_TO_TOP_PARAM] === 'true';
  React.useEffect(() => {
    if (!shouldPopToTop) {
      return;
    }
    dismissToTop();
    clearRouteParam(POP_TO_TOP_PARAM);
  }, [shouldPopToTop]);
  return <MainScreen />;
};

export default RatesIndexRoute;
