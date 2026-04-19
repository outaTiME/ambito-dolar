/// <reference path="../.sst/platform/config.d.ts" />

import type { StackContext } from './context';
import type { StackResources } from './resources';

export function createCrons(ctx: StackContext, resources: StackResources) {
  const { topic } = resources;

  // eslint-disable-next-line no-new
  new sst.aws.CronV2('Process', {
    // 10hs to 17:55hs
    schedule: 'cron(0/5 10-17 ? * MON-FRI *)',
    timezone: ctx.scheduleTimezone,
    enabled: ctx.enableCronJobs,
    function: {
      handler: 'packages/backend/src/jobs/process.handler',
      link: [topic],
      environment: {
        ...ctx.baseRuntimeEnv,
      },
    },
  });

  // eslint-disable-next-line no-new
  new sst.aws.CronV2('ProcessClose', {
    // 18hs
    schedule: 'cron(0 18 ? * MON-FRI *)',
    timezone: ctx.scheduleTimezone,
    enabled: ctx.enableCronJobs,
    function: {
      handler: 'packages/backend/src/jobs/process-close.handler',
      link: [topic],
      environment: {
        ...ctx.baseRuntimeEnv,
      },
    },
  });

  // eslint-disable-next-line no-new
  new sst.aws.CronV2('InvalidateReceipts', {
    // 20hs
    schedule: 'cron(0 20 ? * MON-FRI *)',
    timezone: ctx.scheduleTimezone,
    enabled: ctx.enableCronJobs,
    function: {
      handler: 'packages/backend/src/jobs/invalidate-receipts.handler',
      link: [topic],
      environment: {
        ...ctx.baseRuntimeEnv,
      },
    },
  });

  // eslint-disable-next-line no-new
  new sst.aws.CronV2('FundingNotify', {
    // last day of month at 23:59 (for full month stats)
    schedule: 'cron(59 23 L * ? *)',
    timezone: ctx.scheduleTimezone,
    enabled: ctx.enableCronJobs,
    function: {
      handler: 'packages/backend/src/jobs/funding-notify.handler',
      link: [topic],
      environment: {
        ...ctx.baseRuntimeEnv,
      },
    },
  });
}
