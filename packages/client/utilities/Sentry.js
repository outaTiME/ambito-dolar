import * as Sentry from 'sentry-expo';

import Settings from '../config/settings';

const init = (dsn) =>
  Sentry.init({
    dsn,
    // enableInExpoDevelopment: true,
    debug: __DEV__,
    // https://docs.sentry.io/platforms/react-native/performance/instrumentation/automatic-instrumentation/#opt-out
    enableAutoPerformanceTracing: false,
  });

Settings.IS_PRODUCTION && Settings.SENTRY_DSN && init(Settings.SENTRY_DSN);

const setUserContext = (ctx) => {
  ctx = ctx || {};
  Sentry.Native.configureScope((scope) => {
    scope.setUser(ctx);
  });
};

const withScope = (opts, cb) => {
  const { extras, tags, level = 'error' } = opts ?? {};
  Sentry.Native.withScope((scope) => {
    extras && scope.setExtras(extras);
    tags && scope.setTags(tags);
    scope.setLevel(level);
    cb?.();
  });
};

const captureMessage = (msg, opts) => {
  withScope(opts, () => {
    Sentry.Native.captureMessage(msg);
  });
};

const captureException = (e, opts) => {
  withScope(opts, () => {
    Sentry.Native.captureException(e);
  });
};

const addBreadcrumb = ({ data, ...opts }) => {
  Sentry.Native.addBreadcrumb({
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

const nativeCrash = Sentry?.Native?.nativeCrash;

export default {
  setUserContext,
  captureMessage,
  captureException,
  addBreadcrumb,
  nativeCrash,
};
