import { MainStack } from './stacks/MainStack.js';

export default {
  config: () => ({
    name: 'ambito-dolar',
    region: 'us-east-1',
  }),
  stacks: (app) => {
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionOptions.html
    app.setDefaultFunctionProps({
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
        SENTRY_DSN: process.env.SENTRY_DSN,
        AMPLITUDE_API_KEY: process.env.AMPLITUDE_API_KEY,
        AMPLITUDE_SECRET_KEY: process.env.AMPLITUDE_SECRET_KEY,
        AMPLITUDE_USAGE_STATS_URL: process.env.AMPLITUDE_USAGE_STATS_URL,
        MASTODON_URL: process.env.MASTODON_URL,
        MASTODON_ACCESS_TOKEN: process.env.MASTODON_ACCESS_TOKEN,
        REDDIT_USERNAME: process.env.REDDIT_USERNAME,
        REDDIT_PASSWORD: process.env.REDDIT_PASSWORD,
        REDDIT_APP_ID: process.env.REDDIT_APP_ID,
        REDDIT_APP_SECRET: process.env.REDDIT_APP_SECRET,
        TWITTER_APP_KEY: process.env.TWITTER_APP_KEY,
        TWITTER_APP_SECRET: process.env.TWITTER_APP_SECRET,
        TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
        TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET,
        BSKY_USERNAME: process.env.BSKY_USERNAME,
        BSKY_PASSWORD: process.env.BSKY_PASSWORD,
        // https://aws.amazon.com/es/blogs/compute/node-js-18-x-runtime-now-available-in-aws-lambda/
        // NODE_OPTIONS: '--no-experimental-fetch',
        // prevents experimental warnings from buffer.File
        NODE_OPTIONS: '--no-warnings',
        // NODE_NO_WARNINGS: 1,
      },
      runtime: 'nodejs18.x',
      tracing: 'disabled',
      // https://docs.serverless-stack.com/constructs/Function#setting-additional-props
      logRetention: 'one_day',
      retryAttempts: 0,
    });
    app.setDefaultRemovalPolicy('destroy');
    app.stack(MainStack, { id: 'stack' });
  },
};
