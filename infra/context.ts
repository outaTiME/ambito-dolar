/// <reference path="../.sst/platform/config.d.ts" />

type ContextInput = {
  app: {
    stage: string;
  };
  dev: boolean;
};

export function createContext({ app, dev }: ContextInput) {
  const requiredEnv = (name: string) => {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  };

  const isProduction = app.stage === 'prod';

  const ratesObjectEnv = {
    RATE_STATS_OBJECT_KEY: requiredEnv('RATE_STATS_OBJECT_KEY'),
    RATES_LEGACY_OBJECT_KEY: requiredEnv('RATES_LEGACY_OBJECT_KEY'),
    RATES_OBJECT_KEY: requiredEnv('RATES_OBJECT_KEY'),
    QUOTES_OBJECT_KEY: requiredEnv('QUOTES_OBJECT_KEY'),
    FETCH_OBJECT_KEY: requiredEnv('FETCH_OBJECT_KEY'),
  };

  const realtimeEnv = {
    FIREBASE_CLIENT_EMAIL: requiredEnv('FIREBASE_CLIENT_EMAIL'),
    FIREBASE_PRIVATE_KEY: requiredEnv('FIREBASE_PRIVATE_KEY'),
    FIREBASE_DATABASE_URL: requiredEnv('FIREBASE_DATABASE_URL'),
    INSTANT_APP_ID: requiredEnv('INSTANT_APP_ID'),
    INSTANT_ADMIN_TOKEN: requiredEnv('INSTANT_ADMIN_TOKEN'),
  };

  const socialEnv = {
    IFTTT_KEY: requiredEnv('IFTTT_KEY'),
    IMGUR_CLIENT_ID: requiredEnv('IMGUR_CLIENT_ID'),
    IMGBB_KEY: requiredEnv('IMGBB_KEY'),
    MASTODON_URL: requiredEnv('MASTODON_URL'),
    MASTODON_ACCESS_TOKEN: requiredEnv('MASTODON_ACCESS_TOKEN'),
    REDDIT_USERNAME: requiredEnv('REDDIT_USERNAME'),
    REDDIT_PASSWORD: requiredEnv('REDDIT_PASSWORD'),
    REDDIT_APP_ID: requiredEnv('REDDIT_APP_ID'),
    REDDIT_APP_SECRET: requiredEnv('REDDIT_APP_SECRET'),
    BSKY_USERNAME: requiredEnv('BSKY_USERNAME'),
    BSKY_PASSWORD: requiredEnv('BSKY_PASSWORD'),
    WHATSAPP_CHANNEL_ID: requiredEnv('WHATSAPP_CHANNEL_ID'),
    WHAPI_TOKEN: requiredEnv('WHAPI_TOKEN'),
    IG_PAGE_TOKEN: requiredEnv('IG_PAGE_TOKEN'),
    IG_USER_ID: requiredEnv('IG_USER_ID'),
    IMGHIPPO_API_KEY: requiredEnv('IMGHIPPO_API_KEY'),
    FREEIMAGE_API_KEY: requiredEnv('FREEIMAGE_API_KEY'),
  };

  const baseRuntimeEnv = {
    SENTRY_DSN: requiredEnv('SENTRY_DSN'),
    IS_LOCAL: dev ? 'true' : 'false',
    IS_PRODUCTION: isProduction ? 'true' : 'false',
  };

  return {
    isProduction,
    shouldDeployWebApps: !dev,
    enableCronJobs: isProduction,
    // keep aligned with timezone defined in core
    scheduleTimezone: 'America/Argentina/Buenos_Aires',
    requiredEnv,
    ratesObjectEnv,
    realtimeEnv,
    socialEnv,
    baseRuntimeEnv,
    socialScreenshotEnv: {} as {
      SOCIAL_SCREENSHOT_URL?: $util.Output<string>;
    },
  };
}

export type StackContext = ReturnType<typeof createContext>;
