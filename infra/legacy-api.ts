/// <reference path="../.sst/platform/config.d.ts" />

import type { StackContext } from './context';
import type { StackResources } from './resources';

const MANAGED_CACHE_POLICY_CACHING_DISABLED =
  '4135ea2d-6df8-44a3-9df3-4b5a84be39ad';
const MANAGED_CACHE_POLICY_CACHING_OPTIMIZED =
  '658327ea-f89d-4fab-a63d-7e88639e58f6';
const MANAGED_ORIGIN_REQUEST_POLICY_ALL_VIEWER_EXCEPT_HOST =
  'b689b0a8-53d0-40ab-baf2-68738e2966ac';
const FETCH_CACHE_TTL_SECONDS = 300; // 5 minutes

function createWwwCdn(
  ctx: StackContext,
  legacyApi: sst.aws.ApiGatewayV2,
  landingSite: sst.aws.StaticSite,
  bucket: StackResources['bucket'],
) {
  if (!ctx.isProduction) {
    return;
  }

  const landingOriginHostname = landingSite.url.apply(
    (url) => new URL(url).hostname,
  );
  const legacyApiOriginHostname = legacyApi.nodes.api.apiEndpoint.apply(
    (endpoint) => new URL(endpoint).hostname,
  );

  const cachePolicy = new aws.cloudfront.CachePolicy('WwwFetchCachePolicy', {
    defaultTtl: FETCH_CACHE_TTL_SECONDS,
    maxTtl: FETCH_CACHE_TTL_SECONDS,
    minTtl: FETCH_CACHE_TTL_SECONDS,
    parametersInCacheKeyAndForwardedToOrigin: {
      cookiesConfig: { cookieBehavior: 'none' },
      headersConfig: { headerBehavior: 'none' },
      queryStringsConfig: { queryStringBehavior: 'none' },
    },
  });

  // eslint-disable-next-line no-new
  new aws.cloudfront.Distribution('WwwCdn', {
    enabled: true,
    comment: 'WwwCdn',
    aliases: ['www.ambito-dolar.app'],
    origins: [
      {
        originId: 'landing-origin',
        domainName: landingOriginHostname,
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: 'https-only',
          originSslProtocols: ['TLSv1.2'],
        },
      },
      {
        originId: 'legacy-api-origin',
        domainName: legacyApiOriginHostname,
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
      targetOriginId: 'landing-origin',
      viewerProtocolPolicy: 'redirect-to-https',
      allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      cachedMethods: ['GET', 'HEAD'],
      cachePolicyId: MANAGED_CACHE_POLICY_CACHING_OPTIMIZED,
    },
    orderedCacheBehaviors: [
      {
        pathPattern: '/api/fetch',
        targetOriginId: 'fetch-s3-origin',
        viewerProtocolPolicy: 'redirect-to-https',
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD'],
        cachePolicyId: cachePolicy.id,
      },
      {
        pathPattern: '/api/*',
        targetOriginId: 'legacy-api-origin',
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

export function createLegacyApi(
  ctx: StackContext,
  api: sst.aws.ApiGatewayV2,
  landingSite: sst.aws.StaticSite | false,
  resources: StackResources,
) {
  const { bucket } = resources;

  const legacyApi = new sst.aws.ApiGatewayV2('LegacyApi', {
    ...(ctx.isProduction && {
      domain: {
        name: 'www.ambito-dolar.app',
        dns: false,
        cert: ctx.requiredEnv('DOMAIN_CERTIFICATE_ARN'),
      },
    }),
    accessLog: {
      retention: '1 day',
    },
  });

  legacyApi.routeUrl('ANY /api/{proxy+}', $interpolate`${api.url}/{proxy}`);

  if (landingSite) {
    legacyApi.routeUrl('$default', landingSite.url);
    createWwwCdn(ctx, legacyApi, landingSite, bucket);
  }
}
