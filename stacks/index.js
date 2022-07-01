import * as logs from 'aws-cdk-lib/aws-logs';

import { Stack } from './Stack';

export default function main(app) {
  app.setDefaultFunctionProps({
    bundle: {
      format: 'esm',
    },
    environment: {
      S3_BUCKET: process.env.S3_BUCKET,
      SECRET_KEY: process.env.SECRET_KEY,
      DEVICES_TABLE_NAME: process.env.DEVICES_TABLE_NAME,
      NOTIFICATIONS_TABLE_NAME: process.env.NOTIFICATIONS_TABLE_NAME,
      RATE_STATS_OBJECT_KEY: process.env.RATE_STATS_OBJECT_KEY,
      RATES_LEGACY_OBJECT_KEY: process.env.RATES_LEGACY_OBJECT_KEY,
      RATES_OBJECT_KEY: process.env.RATES_OBJECT_KEY,
      QUOTES_OBJECT_KEY: process.env.QUOTES_OBJECT_KEY,
      IFTTT_KEY: process.env.IFTTT_KEY,
      IMGUR_CLIENT_ID: process.env.IMGUR_CLIENT_ID,
      IG_USERNAME: process.env.IG_USERNAME,
      IG_PASSWORD: process.env.IG_PASSWORD,
      RATE_URL: process.env.RATE_URL,
      CRYPTO_RATES_URL: process.env.CRYPTO_RATES_URL,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    },
    runtime: 'nodejs16.x',
    srcPath: 'packages/api',
    tracing: 'disabled',
    // https://docs.serverless-stack.com/constructs/Function#setting-additional-props
    logRetention: logs.RetentionDays.ONE_DAY,
    // https://github.com/aws/aws-cdk/issues/8257
    /* logRetentionRetryOptions: {
      base: Duration.millis(500),
      maxRetries: 15,
    }, */
    retryAttempts: 0,
  });
  app.setDefaultRemovalPolicy('destroy');
  app.stack(Stack, { id: 'stack' });
}
