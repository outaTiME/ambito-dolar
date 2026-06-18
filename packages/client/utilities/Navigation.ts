import { router } from 'expo-router';

const navigateRoute = (routePath) => {
  router.navigate(routePath);
};

export const goBack = () => {
  if (router.canGoBack()) {
    router.back();
  }
};

export const dismissToTop = () => {
  if (router.canGoBack()) {
    router.dismissAll();
  }
};

export const clearRouteParam = (name) => {
  router.setParams({ [name]: undefined });
};

export const goToRatesWithPopToTop = () => {
  navigateRoute({
    pathname: '/rates',
    params: {
      popToTop: 'true',
    },
  });
};

export const goToRateDetail = (type) => {
  navigateRoute({
    pathname: '/rates/[type]',
    params: { type },
  });
};

export const goToRateRawDetail = (type, rangeIndex) => {
  navigateRoute({
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
  navigateRoute('/settings/notifications');
};

export const goToAdvancedNotifications = (type) => {
  navigateRoute({
    pathname: '/settings/notifications/[type]',
    params: { type },
  });
};

export const goToAppearance = () => {
  navigateRoute('/settings/appearance');
};

export const goToCustomizeRates = (modal = false) => {
  navigateRoute(modal ? '/customize-rates' : '/settings/customize-rates');
};

export const goToRateOrder = (modal = false) => {
  navigateRoute(
    modal ? '/customize-rates/order' : '/settings/customize-rates/order',
  );
};

export const goToStatistics = () => {
  navigateRoute('/settings/statistics');
};

export const goToDeveloper = () => {
  navigateRoute('/settings/developer');
};

export const goToAbout = () => {
  navigateRoute('/settings/about');
};

export const goToRateWidgetPreview = () => {
  navigateRoute('/settings/rate-widget-preview');
};

export const goToCustomizeRatesModal = () => {
  goToCustomizeRates(true);
};

export const goToDonate = () => {
  navigateRoute('/settings/donate');
};

export const goToDonateModal = () => {
  navigateRoute('/donate');
};
