import { MainStack } from './stacks/MainStack.js';

export default {
  config: () => ({
    name: 'ambito-dolar',
    region: 'us-east-1',
  }),
  stacks: (app) => {
    // https://v2.sst.dev/constructs/Function#setting-default-props
    app.setDefaultFunctionProps({
      architecture: 'x86_64',
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
        IMGBB_KEY: process.env.IMGBB_KEY,
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
        BSKY_USERNAME: process.env.BSKY_USERNAME,
        BSKY_PASSWORD: process.env.BSKY_PASSWORD,
        WHATSAPP_CHANNEL_ID: process.env.WHATSAPP_CHANNEL_ID,
        WHAPI_TOKEN: process.env.WHAPI_TOKEN,
        INSTANT_APP_ID: process.env.INSTANT_APP_ID,
        INSTANT_ADMIN_TOKEN: process.env.INSTANT_ADMIN_TOKEN,
      },
      logRetention: 'one_day',
      runtime: 'nodejs22.x',
      tracing: 'disabled',
      // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionOptions.html#retryattempts
      retryAttempts: 0,
    });
    app.setDefaultRemovalPolicy('destroy');
    app.stack(MainStack, { id: 'stack' });
  },
};
