import { router } from 'expo-router';

const pushRoute = (routePath: any) => {
  router.push(routePath);
};

const navigateRoute = (routePath: any) => {
  router.navigate(routePath);
};

export const goToRatesWithPopToTop = () => {
  navigateRoute({
    pathname: '/rates',
    params: {
      popToTop: 'true',
    },
  });
};

export const goToRateDetail = (type: string) => {
  pushRoute({
    pathname: '/rates/[type]',
    params: { type },
  });
};

export const goToRateRawDetail = (type: string, rangeIndex?: number) => {
  pushRoute({
    pathname: '/rates/[type]/raw',
    params: {
      type,
      ...(rangeIndex !== undefined && { rangeIndex: String(rangeIndex) }),
    },
  });
};

export const goToConversion = () => {
  navigateRoute('/conversion');
};

export const goToConversionWithFocus = () => {
  navigateRoute({
    pathname: '/conversion',
    params: {
      focus: 'true',
    },
  });
};

export const goToNotifications = () => {
  pushRoute('/settings/notifications');
};

export const goToAdvancedNotifications = (type: string) => {
  pushRoute({
    pathname: '/settings/notifications/[type]',
    params: { type },
  });
};

export const goToAppearance = () => {
  pushRoute('/settings/appearance');
};

export const goToCustomizeRates = (modal = false) => {
  pushRoute(modal ? '/customize-rates' : '/settings/customize-rates');
};

export const goToRateOrder = (modal = false) => {
  pushRoute(
    modal ? '/customize-rates/order' : '/settings/customize-rates/order',
  );
};

export const goToRateDisplay = (modal = false) => {
  pushRoute(
    modal ? '/customize-rates/display' : '/settings/customize-rates/display',
  );
};

export const goToStatistics = () => {
  pushRoute('/settings/statistics');
};

export const goToDeveloper = () => {
  pushRoute('/settings/developer');
};

export const goToAbout = () => {
  pushRoute('/settings/about');
};

export const goToRateWidgetPreview = () => {
  pushRoute('/settings/rate-widget-preview');
};

export const goToCustomizeRatesModal = () => {
  goToCustomizeRates(true);
};
