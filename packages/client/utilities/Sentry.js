import * as Sentry from 'sentry-expo';

import Settings from '../config/settings';

const init = (dsn) =>
  Sentry.init({
    dsn,
    // enableInExpoDevelopment: true,
    debug: __DEV__,
  });

Settings.IS_PRODUCTION && Settings.SENTRY_DSN && init(Settings.SENTRY_DSN);

const setUserContext = (ctx) => {
  ctx = ctx || {};
  Sentry.Native.configureScope((scope) => {
    scope.setUser(ctx);
  });
};

const captureMessage = (msg, opts) => {
  opts = opts || {};
  Sentry.Native.withScope((scope) => {
    if (opts.extra) {
      scope.setExtra(opts.extra);
    }
    scope.setLevel(opts.level || 'error');
    Sentry.Native.captureMessage(msg);
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
  addBreadcrumb,
  nativeCrash,
};
