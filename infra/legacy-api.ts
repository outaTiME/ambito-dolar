/// <reference path="../.sst/platform/config.d.ts" />

import type { StackContext } from './context';

export function createLegacyApi(
  ctx: StackContext,
  api: sst.aws.ApiGatewayV2,
  landingSite: sst.aws.StaticSite | false,
) {
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
  }

  return legacyApi;
}
