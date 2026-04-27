/// <reference path="../.sst/platform/config.d.ts" />

import type { StackContext } from './context';
import type { StackResources } from './resources';

const MANAGED_CACHE_POLICY_CACHING_DISABLED =
  '4135ea2d-6df8-44a3-9df3-4b5a84be39ad';
const MANAGED_ORIGIN_REQUEST_POLICY_ALL_VIEWER_EXCEPT_HOST =
  'b689b0a8-53d0-40ab-baf2-68738e2966ac';
const FETCH_CACHE_TTL_SECONDS = 300; // 5 minutes

function createApiFetchCdn(
  ctx: StackContext,
  api: sst.aws.ApiGatewayV2,
  bucket: StackResources['bucket'],
) {
  if (!ctx.isProduction) {
    return;
  }

  const cachePolicy = new aws.cloudfront.CachePolicy('ApiFetchCachePolicy', {
    defaultTtl: FETCH_CACHE_TTL_SECONDS,
    maxTtl: FETCH_CACHE_TTL_SECONDS,
    minTtl: FETCH_CACHE_TTL_SECONDS,
    parametersInCacheKeyAndForwardedToOrigin: {
      cookiesConfig: { cookieBehavior: 'none' },
      headersConfig: { headerBehavior: 'none' },
      queryStringsConfig: { queryStringBehavior: 'none' },
    },
  });

  const apiOriginHostname = api.nodes.api.apiEndpoint.apply(
    (endpoint) => new URL(endpoint).hostname,
  );

  // eslint-disable-next-line no-new
  new aws.cloudfront.Distribution('ApiFetchCdn', {
    enabled: true,
    comment: 'ApiFetchCdn',
    aliases: ['api.ambito-dolar.app'],
    origins: [
      {
        originId: 'api-origin',
        domainName: apiOriginHostname,
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: 'https-only',
          originSslProtocols: ['TLSv1.2'],
        },
      },
      {
        originId: 'fetch-s3-origin',
        domainName: bucket.nodes.bucket.bucketRegionalDomainName,
        s3OriginConfig: {
          originAccessIdentity: '',
        },
      },
    ],
    defaultCacheBehavior: {
      targetOriginId: 'api-origin',
      viewerProtocolPolicy: 'redirect-to-https',
      allowedMethods: [
        'GET',
        'HEAD',
        'OPTIONS',
        'PUT',
        'PATCH',
        'POST',
        'DELETE',
      ],
      cachedMethods: ['GET', 'HEAD'],
      cachePolicyId: MANAGED_CACHE_POLICY_CACHING_DISABLED,
      originRequestPolicyId:
        MANAGED_ORIGIN_REQUEST_POLICY_ALL_VIEWER_EXCEPT_HOST,
    },
    orderedCacheBehaviors: [
      {
        pathPattern: '/fetch',
        targetOriginId: 'fetch-s3-origin',
        viewerProtocolPolicy: 'redirect-to-https',
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD'],
        cachePolicyId: cachePolicy.id,
      },
    ],
    restrictions: {
      geoRestriction: {
        restrictionType: 'none',
      },
    },
    viewerCertificate: {
      acmCertificateArn: ctx.requiredEnv('DOMAIN_CERTIFICATE_ARN'),
      sslSupportMethod: 'sni-only',
      minimumProtocolVersion: 'TLSv1.2_2021',
    },
  });
}

export function createApi(
  ctx: StackContext,
  resources: StackResources,
): sst.aws.ApiGatewayV2 {
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

  createApiFetchCdn(ctx, api, bucket);

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
    'GET /test',
    {
      handler: 'packages/backend/src/routes/test.handler',
      environment: {
        ...baseRuntimeEnv,
      },
    },
    { name: 'Test', ...privateRouteAuth },
  );
  api.route(
    'GET /process',
    {
      handler: 'packages/backend/src/routes/process.handler',
      link: [topic],
      environment: {
        ...baseRuntimeEnv,
      },
    },
    { name: 'Process', ...privateRouteAuth },
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
    { name: 'ActiveDevices', ...privateRouteAuth },
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
    { name: 'Notify', ...privateRouteAuth },
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
    { name: 'SocialNotify', ...privateRouteAuth },
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
    { name: 'FundingNotify', ...privateRouteAuth },
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
    { name: 'UpdateRates', ...privateRouteAuth },
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
    { name: 'UpdateHistoricalRates', ...privateRouteAuth },
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
    { name: 'FetchRate', ...privateRouteAuth },
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
    { name: 'InvalidateReceipts', ...privateRouteAuth },
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
    { name: 'PruneDevices', ...privateRouteAuth },
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
    { name: 'ExportDevices', ...privateRouteAuth },
  );

  // public
  api.route(
    'GET /fetch',
    {
      handler: 'packages/backend/src/routes/fetch.handler',
      link: [bucket],
      environment: {
        ...baseRuntimeEnv,
        QUOTES_OBJECT_KEY: ctx.requiredEnv('QUOTES_OBJECT_KEY'),
      },
    },
    { name: 'Fetch' },
  );
  api.route(
    'POST /register-device',
    {
      handler: 'packages/backend/src/routes/register-device.handler',
      link: [devicesTable],
      environment: {
        ...baseRuntimeEnv,
      },
    },
    { name: 'RegisterDevice' },
  );
  api.route(
    'GET /stats',
    {
      handler: 'packages/backend/src/routes/stats.handler',
      environment: {
        ...baseRuntimeEnv,
        AMPLITUDE_API_KEY: ctx.requiredEnv('AMPLITUDE_API_KEY'),
        AMPLITUDE_SECRET_KEY: ctx.requiredEnv('AMPLITUDE_SECRET_KEY'),
        AMPLITUDE_USAGE_STATS_URL: ctx.requiredEnv('AMPLITUDE_USAGE_STATS_URL'),
      },
    },
    { name: 'Stats' },
  );

  return api;
}
