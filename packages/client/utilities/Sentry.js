import * as Sentry from '@sentry/react-native';

import Settings from '../config/settings';

// bypass on development mode
let wrap = (cmp) => cmp;

const init = (dsn) => {
  Sentry.init({
    dsn,
    debug: __DEV__,
    // https://docs.sentry.io/platforms/react-native/performance/instrumentation/automatic-instrumentation/#opt-out
    enableAutoPerformanceTracing: false,
  });
  // prevent sentry warning on development mode
  wrap = Sentry.wrap;
};

Settings.IS_PRODUCTION && Settings.SENTRY_DSN && init(Settings.SENTRY_DSN);

const setUserContext = (ctx = {}) => {
  Sentry.configureScope((scope) => {
    scope.setUser(ctx);
  });
};

const withScope = ({ extras, tags, level = 'error' } = {}, cb) => {
  Sentry.withScope((scope) => {
    extras && scope.setExtras(extras);
    tags && scope.setTags(tags);
    scope.setLevel(level);
    cb?.();
  });
};

const captureMessage = (msg, opts) => {
  withScope(opts, () => {
    Sentry.captureMessage(msg);
  });
};

const captureException = (e, opts) => {
  withScope(opts, () => {
    Sentry.captureException(e);
  });
};

const addBreadcrumb = ({ data, ...opts }) => {
  Sentry.addBreadcrumb({
    category: 'application',
    level: 'debug',
    ...opts,
    ...(data && {
      data: {
        extra: data,
      },
    }),
  });
};

const nativeCrash = Sentry.nativeCrash;

export default {
  setUserContext,
  captureMessage,
  captureException,
  addBreadcrumb,
  nativeCrash,
  wrap,
};
