import { RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';

import Stack from './Stack';

export default function main(app) {
  // Set default runtime for all functions
  app.setDefaultFunctionProps({
    // https://docs.serverless-stack.com/constructs/Function#runtime
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.NodejsFunction.html#runtime
    // runtime: 'nodejs14.x',
    runtime: lambda.Runtime.NODEJS_14_X,
    environment: {
      S3_BUCKET: process.env.S3_BUCKET,
      SECRET_KEY: process.env.SECRET_KEY,
      DEVICES_TABLE_NAME: process.env.DEVICES_TABLE_NAME,
      NOTIFICATIONS_TABLE_NAME: process.env.NOTIFICATIONS_TABLE_NAME,
      RATE_STATS_OBJECT_KEY: process.env.RATE_STATS_OBJECT_KEY,
      RATES_LEGACY_OBJECT_KEY: process.env.RATES_LEGACY_OBJECT_KEY,
      RATES_V5_OBJECT_KEY: process.env.RATES_V5_OBJECT_KEY,
      RATES_OBJECT_KEY: process.env.RATES_OBJECT_KEY,
      IFTTT_KEY: process.env.IFTTT_KEY,
      SOCIAL_SCREENSHOT_URL: process.env.SOCIAL_SCREENSHOT_URL,
      IMGUR_CLIENT_ID: process.env.IMGUR_CLIENT_ID,
      IG_USERNAME: process.env.IG_USERNAME,
      IG_PASSWORD: process.env.IG_PASSWORD,
      CHROME_LAYER_ARN: process.env.CHROME_LAYER_ARN,
      DOMAIN_CERTIFICATE_ARN: process.env.DOMAIN_CERTIFICATE_ARN,
      RATE_URL: process.env.RATE_URL,
      CRYPTO_RATES_URL: process.env.CRYPTO_RATES_URL,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    },
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.NodejsFunction.html#retryattempts
    retryAttempts: 0,
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.NodejsFunction.html#logretention
    logRetention: logs.RetentionDays.ONE_WEEK,
  });
  // Remove all resources when non-prod stages are removed
  // if (app.stage !== 'prod') {
  app.setDefaultRemovalPolicy(RemovalPolicy.DESTROY);
  // }
  // eslint-disable-next-line no-new
  new Stack(app, 'stack');
}
