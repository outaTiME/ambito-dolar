import { usePathname } from 'expo-router';
import React from 'react';

import Amplitude from '@/utilities/Amplitude';
import Helper from '@/utilities/Helper';
import Sentry from '@/utilities/Sentry';

const EXACT_ROUTE_MAP = {
  '/': 'Main',
  '/(tabs)': 'Main',
  '/rates': 'Main',
  '/(tabs)/rates': 'Main',
  '/conversion': 'Conversion',
  '/(tabs)/conversion': 'Conversion',
  '/settings': 'Settings',
  '/(tabs)/settings': 'Settings',
  '/settings/notifications': 'Notifications',
  '/settings/appearance': 'Appearance',
  '/settings/customize-rates': 'CustomizeRates',
  '/customize-rates': 'CustomizeRates',
  '/settings/customize-rates/order': 'RateOrder',
  '/customize-rates/order': 'RateOrder',
  '/settings/customize-rates/display': 'RateDisplay',
  '/customize-rates/display': 'RateDisplay',
  '/settings/statistics': 'Statistics',
  '/settings/about': 'About',
  '/settings/developer': 'Developer',
  '/settings/rate-widget-preview': 'RateWidgetPreview',
};

const getTrackedScreenFromPathname = (pathname: string) => {
  if (!pathname) {
    return null;
  }
  const normalizedPathname =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  if (EXACT_ROUTE_MAP[normalizedPathname]) {
    return EXACT_ROUTE_MAP[normalizedPathname];
  }
  if (normalizedPathname.startsWith('/settings/notifications/')) {
    return 'AdvancedNotifications';
  }
  if (
    normalizedPathname.startsWith('/rates/') &&
    normalizedPathname.endsWith('/raw')
  ) {
    return 'RateRawDetail';
  }
  if (normalizedPathname.startsWith('/rates/')) {
    return 'RateDetail';
  }
  return null;
};

export default function useNavigationTrackingRouter() {
  const pathname = usePathname();
  const previousRouteNameRef = React.useRef<any>(undefined);
  React.useEffect(() => {
    const currentRouteName = getTrackedScreenFromPathname(pathname);
    if (
      !currentRouteName ||
      previousRouteNameRef.current === currentRouteName
    ) {
      return;
    }
    Helper.debug('👀 Track screen', currentRouteName);
    Sentry.addBreadcrumb({
      message: `${currentRouteName} screen`,
      data: {},
    });
    Amplitude.track(`${currentRouteName} screen`);
    previousRouteNameRef.current = currentRouteName;
  }, [pathname]);
}
