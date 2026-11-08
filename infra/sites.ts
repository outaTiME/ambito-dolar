/// <reference path="../.sst/platform/config.d.ts" />

import type { StackContext } from './context';

export function createSites(ctx: StackContext, api: sst.aws.ApiGatewayV2) {
  const screenshotSite =
    ctx.shouldDeployWebApps &&
    new sst.aws.StaticSite('ScreenshotSite', {
      path: 'packages/client',
      build: {
        command: 'yarn expo export -p web --clear',
        output: 'dist',
      },
      environment: {
        IS_PRODUCTION: ctx.isProduction.toString(),
        API_URL: api.url,
      },
    });

  ctx.socialScreenshotEnv = {
    ...(screenshotSite && {
      SOCIAL_SCREENSHOT_URL: screenshotSite.url,
    }),
  };

  if (ctx.shouldDeployWebApps) {
    // eslint-disable-next-line no-new
    new sst.aws.StaticSite('LandingSite', {
      path: 'packages/website',
      build: {
        command: 'yarn build',
        output: 'dist',
      },
      ...(ctx.isProduction && {
        domain: {
          name: 'www.ambito-dolar.app',
          dns: false,
          cert: ctx.requiredEnv('DOMAIN_CERTIFICATE_ARN'),
        },
      }),
    });
  }
}
