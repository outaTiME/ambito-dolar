/// <reference path="../.sst/platform/config.d.ts" />

import type { StackContext } from './context';
import type { StackResources } from './resources';

export function createApi(ctx: StackContext, resources: StackResources) {
  const { baseRuntimeEnv } = ctx;
  const { bucket, topic, devicesTable } = resources;

  const api = new sst.aws.ApiGatewayV2('Api', {
    ...(ctx.isProduction && {
      domain: {
        name: 'api.ambito-dolar.app',
        dns: false,
        cert: ctx.requiredEnv('DOMAIN_CERTIFICATE_ARN'),
      },
    }),
    accessLog: {
      retention: '1 day',
    },
    transform: {
      route: {
        handler: (args) => {
          // ~20s
          args.timeout ??= '40 seconds';
        },
      },
    },
  });

  const basicAuthorizer = api.addAuthorizer({
    name: 'basicAuthorizer',
    lambda: {
      function: {
        handler: 'packages/backend/src/authorizers/basic.handler',
        environment: {
          SECRET_KEY: ctx.requiredEnv('SECRET_KEY'),
        },
      },
      response: 'simple',
      ttl: '30 seconds',
    },
  });

  const privateRouteAuth = {
    auth: {
      lambda: basicAuthorizer.id,
    },
  };

  // private
  api.route(
    'GET /process',
    {
      handler: 'packages/backend/src/routes/process.handler',
      link: [topic],
      environment: {
        ...baseRuntimeEnv,
      },
    },
    privateRouteAuth,
  );
  api.route(
    'GET /active-devices',
    {
      handler: 'packages/backend/src/routes/active-devices.handler',
      link: [devicesTable],
      environment: {
        ...baseRuntimeEnv,
      },
    },
    privateRouteAuth,
  );
  api.route(
    'GET /notify',
    {
      handler: 'packages/backend/src/routes/notify.handler',
      link: [topic],
      environment: {
        ...baseRuntimeEnv,
      },
    },
    privateRouteAuth,
  );
  api.route(
    'GET /social-notify',
    {
      handler: 'packages/backend/src/routes/social-notify.handler',
      link: [topic],
      environment: {
        ...baseRuntimeEnv,
      },
    },
    privateRouteAuth,
  );
  api.route(
    'GET /funding-notify',
    {
      handler: 'packages/backend/src/routes/funding-notify.handler',
      link: [topic],
      environment: {
        ...baseRuntimeEnv,
      },
    },
    privateRouteAuth,
  );
  api.route(
    'POST /update-rates',
    {
      handler: 'packages/backend/src/routes/update-rates.handler',
      link: [bucket],
      environment: {
        ...baseRuntimeEnv,
        ...ctx.ratesObjectEnv,
      },
    },
    privateRouteAuth,
  );
  api.route(
    'POST /update-historical-rates',
    {
      handler: 'packages/backend/src/routes/update-historical-rates.handler',
      link: [bucket],
      environment: {
        ...baseRuntimeEnv,
        ...ctx.ratesObjectEnv,
      },
    },
    privateRouteAuth,
  );
  api.route(
    'GET /fetch-rate',
    {
      handler: 'packages/backend/src/routes/fetch-rate.handler',
      environment: {
        ...baseRuntimeEnv,
        RATE_URL: ctx.requiredEnv('RATE_URL'),
      },
    },
    privateRouteAuth,
  );

  // maintenance (private)
  api.route(
    'GET /invalidate-receipts',
    {
      handler: 'packages/backend/src/routes/invalidate-receipts.handler',
      link: [topic],
      environment: {
        ...baseRuntimeEnv,
      },
    },
    privateRouteAuth,
  );
  api.route(
    'GET /prune-devices',
    {
      handler: 'packages/backend/src/routes/prune-devices.handler',
      link: [devicesTable],
      environment: {
        ...baseRuntimeEnv,
      },
    },
    privateRouteAuth,
  );
  api.route(
    'GET /export-devices',
    {
      handler: 'packages/backend/src/routes/export-devices.handler',
      link: [devicesTable, bucket],
      environment: {
        ...baseRuntimeEnv,
      },
    },
    privateRouteAuth,
  );

  // public
  api.route('GET /test', {
    handler: 'packages/backend/src/routes/test.handler',
    environment: {
      ...baseRuntimeEnv,
    },
  });
  api.route('GET /fetch', {
    handler: 'packages/backend/src/routes/fetch.handler',
    link: [bucket],
    environment: {
      ...baseRuntimeEnv,
      QUOTES_OBJECT_KEY: ctx.requiredEnv('QUOTES_OBJECT_KEY'),
    },
  });
  api.route('POST /register-device', {
    handler: 'packages/backend/src/routes/register-device.handler',
    link: [devicesTable],
    environment: {
      ...baseRuntimeEnv,
    },
  });
  api.route('GET /stats', {
    handler: 'packages/backend/src/routes/stats.handler',
    environment: {
      ...baseRuntimeEnv,
      AMPLITUDE_API_KEY: ctx.requiredEnv('AMPLITUDE_API_KEY'),
      AMPLITUDE_SECRET_KEY: ctx.requiredEnv('AMPLITUDE_SECRET_KEY'),
      AMPLITUDE_USAGE_STATS_URL: ctx.requiredEnv('AMPLITUDE_USAGE_STATS_URL'),
    },
  });

  return api;
}
