/// <reference path="../.sst/platform/config.d.ts" />

import type { StackContext } from './context';
import type { StackResources } from './resources';

export function createSubscribers(
  ctx: StackContext,
  resources: StackResources,
) {
  const { bucket, topic, devicesTable, notificationsTable } = resources;

  topic.subscribe(
    'Process',
    {
      handler: 'packages/backend/src/subscribers/process.handler',
      link: [bucket, topic],
      environment: {
        ...ctx.baseRuntimeEnv,
        ...ctx.ratesObjectEnv,
        RATE_URL: ctx.requiredEnv('RATE_URL'),
        ...ctx.realtimeEnv,
      },
      // ~30s
      timeout: '1 minute',
    },
    {
      filter: {
        event: ['process'],
      },
    },
  );

  topic.subscribe(
    'Notify',
    {
      handler: 'packages/backend/src/subscribers/notify.handler',
      link: [bucket, topic, devicesTable, notificationsTable],
      environment: {
        ...ctx.baseRuntimeEnv,
        QUOTES_OBJECT_KEY: ctx.requiredEnv('QUOTES_OBJECT_KEY'),
      },
      // ~2m
      timeout: '4 minutes',
    },
    {
      filter: {
        event: ['notify'],
      },
    },
  );

  topic.subscribe(
    'InvalidateReceipts',
    {
      handler: 'packages/backend/src/subscribers/invalidate-receipts.handler',
      link: [bucket, devicesTable, notificationsTable],
      environment: {
        ...ctx.baseRuntimeEnv,
      },
      // ~30s
      timeout: '1 minute',
    },
    {
      filter: {
        event: ['invalidate-receipts'],
      },
    },
  );

  topic.subscribe(
    'SocialNotify',
    {
      handler: 'packages/backend/src/subscribers/social-notify.handler',
      link: [bucket],
      environment: {
        ...ctx.baseRuntimeEnv,
        ...ctx.socialEnv,
        ...ctx.socialScreenshotEnv,
      },
      nodejs: {
        install: ['@sparticuz/chromium', 'sharp'],
      },
      // ~60s
      timeout: '2 minutes',
    },
    {
      filter: {
        event: ['social-notify'],
      },
    },
  );

  topic.subscribe(
    'FundingNotify',
    {
      handler: 'packages/backend/src/subscribers/funding-notify.handler',
      link: [bucket],
      environment: {
        ...ctx.baseRuntimeEnv,
        ...ctx.socialEnv,
        ...ctx.socialScreenshotEnv,
      },
      nodejs: {
        install: ['@sparticuz/chromium', 'sharp'],
      },
      // ~60s
      timeout: '2 minutes',
    },
    {
      filter: {
        event: ['funding-notify'],
      },
    },
  );
}
