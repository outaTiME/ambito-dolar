import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

import HeaderSubtitle from '@/components/HeaderSubtitle';
import Settings from '@/config/settings';
import useHeaderSubtitle from '@/hooks/useHeaderSubtitle';
import MainScreen from '@/screens/MainScreen';
import { clearRouteParam, dismissToTop } from '@/utilities/Navigation';

const POP_TO_TOP_PARAM = 'popToTop';

// a custom title subview leaves the header with no background on ios 27, so only the
// subtitle scheme pays for it. Keeping the hook in here also means nothing subscribes
// to the tick while the scheme is off
const RatesTitle = () => {
  const subtitle = useHeaderSubtitle();
  return (
    <Stack.Title asChild>
      <HeaderSubtitle title={Settings.APP_NAME} subtitle={subtitle} />
    </Stack.Title>
  );
};

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
  return (
    <>
      {Settings.NEW_HEADER_SCHEME && <RatesTitle />}
      <MainScreen />
    </>
  );
};

export default RatesIndexRoute;
