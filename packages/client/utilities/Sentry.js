import * as Sentry from 'sentry-expo';

const configure = (dsn) => {
  Sentry.init({
    dsn,
    enableInExpoDevelopment: false,
    debug: __DEV__,
  });
};

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
    level: Sentry.Native.Severity.Debug,
    ...opts,
    ...(data && {
      data: {
        extra: data,
      },
    }),
  });
};

export default {
  configure,
  setUserContext,
  captureMessage,
  addBreadcrumb,
};
