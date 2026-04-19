/// <reference path="../.sst/platform/config.d.ts" />

import type { StackContext } from './context';

export function createResources(ctx: StackContext) {
  const bucket = sst.aws.Bucket.get('Bucket', ctx.requiredEnv('S3_BUCKET'));
  const topic = new sst.aws.SnsTopic('Topic');
  const devicesTable = sst.aws.Dynamo.get(
    'Devices',
    ctx.requiredEnv('DEVICES_TABLE_NAME'),
  );
  const notificationsTable = sst.aws.Dynamo.get(
    'Notifications',
    ctx.requiredEnv('NOTIFICATIONS_TABLE_NAME'),
  );

  return {
    bucket,
    topic,
    devicesTable,
    notificationsTable,
  };
}

export type StackResources = ReturnType<typeof createResources>;
