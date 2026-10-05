import { useSegments } from 'expo-router';
import React from 'react';

import Amplitude from '@/utilities/Amplitude';
import Helper from '@/utilities/Helper';
import Sentry from '@/utilities/Sentry';

// keyed by route pattern, groups left out and dynamic segments as written, so a param never moves the name
const SCREENS = {
  rates: 'Main',
  'rates/[type]': 'RateDetail',
  'rates/[type]/raw': 'RateRawDetail',
  markets: 'Markets',
  'markets/[type]': 'MarketDetail',
  'markets/[type]/raw': 'MarketRawDetail',
  conversion: 'Conversion',
  settings: 'Settings',
  'settings/notifications': 'Notifications',
  'settings/notifications/[type]': 'AdvancedNotifications',
  'settings/appearance': 'Appearance',
  'settings/customize-rates': 'CustomizeRates',
  'customize-rates': 'CustomizeRates',
  'settings/customize-rates/order': 'RateOrder',
  'customize-rates/order': 'RateOrder',
  'settings/customize-markets': 'CustomizeMarkets',
  'customize-markets': 'CustomizeMarkets',
  'settings/donate': 'Donate',
  donate: 'DonationModal',
  'settings/statistics': 'Statistics',
  'settings/about': 'About',
  'settings/developer': 'Developer',
};

const getScreenPattern = (segments) =>
  segments
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
    .join('/');

// a screen that is not a route, like the donation sheet, reports itself through here too
export const trackScreen = (name) => {
  Helper.debug('👀 Track screen', name);
  Sentry.addBreadcrumb({
    message: `${name} screen`,
    data: {},
  });
  Amplitude.track(`${name} screen`);
};

export default function useNavigationTrackingRouter() {
  const pattern = getScreenPattern(useSegments());
  const previousRouteNameRef = React.useRef(null);
  React.useEffect(() => {
    const currentRouteName = SCREENS[pattern];
    if (__DEV__ && pattern && !currentRouteName) {
      console.warn('Untracked screen', pattern);
    }
    if (
      !currentRouteName ||
      previousRouteNameRef.current === currentRouteName
    ) {
      return;
    }
    trackScreen(currentRouteName);
    previousRouteNameRef.current = currentRouteName;
  }, [pattern]);
}
