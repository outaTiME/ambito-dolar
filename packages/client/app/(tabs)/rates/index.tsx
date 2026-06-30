import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

import HeaderSubtitle from '@/components/HeaderSubtitle';
import Settings from '@/config/settings';
import useHeaderSubtitle from '@/hooks/useHeaderSubtitle';
import MainScreen from '@/screens/MainScreen';
import { clearRouteParam, dismissToTop } from '@/utilities/Navigation';

const POP_TO_TOP_PARAM = 'popToTop';

const RatesIndexRoute = () => {
  const params = useLocalSearchParams();
  const shouldPopToTop = params?.[POP_TO_TOP_PARAM] === 'true';
  const subtitle = useHeaderSubtitle();
  React.useEffect(() => {
    if (!shouldPopToTop) {
      return;
    }
    dismissToTop();
    clearRouteParam(POP_TO_TOP_PARAM);
  }, [shouldPopToTop]);
  return (
    <>
      <Stack.Title asChild>
        <HeaderSubtitle title={Settings.APP_NAME} subtitle={subtitle} />
      </Stack.Title>
      <MainScreen />
    </>
  );
};

export default RatesIndexRoute;
