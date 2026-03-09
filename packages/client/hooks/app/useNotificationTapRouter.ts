import * as Notifications from 'expo-notifications';
import React from 'react';

import Amplitude from '@/utilities/Amplitude';
import { goToRatesWithPopToTop } from '@/utilities/Navigation';

export default function useNotificationTapRouter() {
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  React.useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.actionIdentifier ===
        Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      Amplitude.track('Select notification');
      goToRatesWithPopToTop();
      Notifications.clearLastNotificationResponse();
    }
  }, [lastNotificationResponse]);
}
