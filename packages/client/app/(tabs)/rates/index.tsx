import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import MainScreen from '@/screens/MainScreen';

const POP_TO_TOP_PARAM = 'popToTop';

const RatesIndexRoute = () => {
  const params = useLocalSearchParams();
  const shouldPopToTop = (params as any)?.[POP_TO_TOP_PARAM] === 'true';
  React.useEffect(() => {
    if (!shouldPopToTop) {
      return;
    }
    if (router.canGoBack()) {
      router.dismissAll();
    }
    router.setParams({ [POP_TO_TOP_PARAM]: undefined });
  }, [shouldPopToTop]);

  return <MainScreen />;
};

export default RatesIndexRoute;
