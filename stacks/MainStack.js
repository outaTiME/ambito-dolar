import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { SubscriptionFilter } from 'aws-cdk-lib/aws-sns';
import { Api, Function, StaticSite, Topic, Cron } from 'sst/constructs';

export function MainStack({ stack }) {
  const IS_PRODUCTION = stack.stage === 'prod';
  // existing resources
  const bucket = s3.Bucket.fromBucketName(
    stack,
    'Bucket',
    process.env.S3_BUCKET,
  );
  const devicesTable = dynamodb.Table.fromTableName(
    stack,
    'Devices',
    process.env.DEVICES_TABLE_NAME,
  );
  const notificationsTable = dynamodb.Table.fromTableName(
    stack,
    'Notifications',
    process.env.NOTIFICATIONS_TABLE_NAME,
  );
  const certificate = Certificate.fromCertificateArn(
    stack,
    'ApiCertificate',
    process.env.DOMAIN_CERTIFICATE_ARN,
  );
  // expo web build
  const screenshotSite = new StaticSite(stack, 'ScreenshotSite', {
    buildCommand: 'yarn expo export:web',
    buildOutput: 'web-build',
    environment: {
      IS_PRODUCTION: IS_PRODUCTION.toString(),
    },
    path: 'packages/client',
  });
  // sns
  const topic = new Topic(stack, 'Topic');
  topic.addSubscribers(stack, {
    process: {
      function: {
        handler: 'packages/api/src/subscribers/process.handler',
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        // ~30s
        timeout: '1 minute',
      },
      cdk: {
        subscription: {
          filterPolicy: {
            event: SubscriptionFilter.stringFilter({
              allowlist: ['process'],
            }),
          },
        },
      },
    },
    invalidateReceipts: {
      function: {
        handler: 'packages/api/src/subscribers/invalidate-receipts.handler',
        // ~15s
        timeout: '30 seconds',
      },
      cdk: {
        subscription: {
          filterPolicy: {
            event: SubscriptionFilter.stringFilter({
              allowlist: ['invalidate-receipts'],
            }),
          },
        },
      },
    },
    notify: {
      function: {
        handler: 'packages/api/src/subscribers/notify.handler',
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        // ~2m
        timeout: '4 minutes',
      },
      cdk: {
        subscription: {
          filterPolicy: {
            event: SubscriptionFilter.stringFilter({
              allowlist: ['notify'],
            }),
          },
        },
      },
    },
    socialNotify: {
      function: {
        handler: 'packages/api/src/subscribers/social-notify.handler',
        nodejs: {
          esbuild: {
            external: ['@sparticuz/chromium', 'sharp'],
          },
        },
        environment: {
          SOCIAL_SCREENSHOT_URL: screenshotSite.url,
        },
        layers: [process.env.CHROME_LAYER_ARN, process.env.SHARP_LAYER_ARN],
        // ~60s
        timeout: '2 minutes',
      },
      cdk: {
        subscription: {
          filterPolicy: {
            event: SubscriptionFilter.stringFilter({
              allowlist: ['social-notify'],
            }),
          },
        },
      },
    },
    fundingNotify: {
      function: {
        handler: 'packages/api/src/subscribers/funding-notify.handler',
        nodejs: {
          esbuild: {
            external: ['@sparticuz/chromium', 'sharp'],
          },
        },
        environment: {
          SOCIAL_SCREENSHOT_URL: screenshotSite.url,
        },
        layers: [process.env.CHROME_LAYER_ARN, process.env.SHARP_LAYER_ARN],
        // ~60s
        timeout: '2 minutes',
      },
      cdk: {
        subscription: {
          filterPolicy: {
            event: SubscriptionFilter.stringFilter({
              allowlist: ['funding-notify'],
            }),
          },
        },
      },
    },
  });
  topic.attachPermissions([bucket, devicesTable, notificationsTable, topic]);
  // jobs
  // eslint-disable-next-line no-new
  new Cron(stack, 'Process', {
    job: {
      function: {
        handler: 'packages/api/src/jobs/process.handler',
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        permissions: [topic],
      },
    },
    // 10hs to 17:55hs
    schedule: 'cron(0/5 13-20 ? * MON-FRI *)',
    enabled: IS_PRODUCTION,
  });
  // eslint-disable-next-line no-new
  new Cron(stack, 'ProcessClose', {
    job: {
      function: {
        handler: 'packages/api/src/jobs/process-close.handler',
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        permissions: [topic],
      },
    },
    // 18hs
    schedule: 'cron(0 21 ? * MON-FRI *)',
    enabled: IS_PRODUCTION,
  });
  // eslint-disable-next-line no-new
  new Cron(stack, 'InvalidateReceipts', {
    job: {
      function: {
        handler: 'packages/api/src/jobs/invalidate-receipts.handler',
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        permissions: [topic],
      },
    },
    // 19hs
    schedule: 'cron(0 22 ? * MON-FRI *)',
    enabled: IS_PRODUCTION,
  });
  // eslint-disable-next-line no-new
  new Cron(stack, 'FundingNotify', {
    job: {
      function: {
        handler: 'packages/api/src/jobs/funding-notify.handler',
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        permissions: [topic],
      },
    },
    // last day of month (23:59hs) (for full month stats)
    schedule: 'cron(59 2 1 * ? *)',
    enabled: IS_PRODUCTION,
  });
  // api endpoints
  const api = new Api(stack, 'Api', {
    accessLog: false,
    authorizers: {
      basicAuthorizer: {
        function: new Function(stack, 'Authorizer', {
          handler: 'packages/api/src/authorizers/basic.handler',
        }),
        responseTypes: ['simple'],
        resultsCacheTtl: '30 seconds',
        type: 'lambda',
      },
    },
    ...(IS_PRODUCTION && {
      customDomain: {
        isExternalDomain: true,
        domainName: 'api.ambito-dolar.app',
        cdk: {
          certificate,
        },
      },
    }),
    defaults: {
      // authorizer: 'none',
      authorizer: 'basicAuthorizer',
      function: {
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        // ~20s
        timeout: '40 seconds',
      },
    },
    routes: {
      // private
      'GET /process': 'packages/api/src/routes/process.handler',
      'GET /active-devices': 'packages/api/src/routes/active-devices.handler',
      'GET /prune-devices': 'packages/api/src/routes/prune-devices.handler',
      'GET /notify': 'packages/api/src/routes/notify.handler',
      'GET /invalidate-receipts':
        'packages/api/src/routes/invalidate-receipts.handler',
      'GET /social-notify': 'packages/api/src/routes/social-notify.handler',
      'GET /funding-notify': 'packages/api/src/routes/funding-notify.handler',
      'POST /update-rates': 'packages/api/src/routes/update-rates.handler',
      'POST /update-historical-rates':
        'packages/api/src/routes/update-historical-rates.handler',
      // public
      'GET /test': {
        authorizer: 'none',
        function: 'packages/api/src/routes/test.handler',
      },
      'GET /fetch': {
        authorizer: 'none',
        function: 'packages/api/src/routes/fetch.handler',
      },
      'POST /register-device': {
        authorizer: 'none',
        function: 'packages/api/src/routes/register-device.handler',
      },
      'GET /stats': {
        authorizer: 'none',
        function: 'packages/api/src/routes/stats.handler',
      },
    },
  });
  api.attachPermissions([bucket, devicesTable, notificationsTable, topic]);
  // landing page with accesss to legacy api
  const landingSite = new StaticSite(stack, 'LandingSite', {
    buildCommand: 'yarn build',
    buildOutput: 'public',
    errorPage: 'redirect_to_index_page',
    path: 'packages/website',
    // waitForInvalidation: IS_PRODUCTION,
  });
  const legacyApi = new Api(stack, 'LegacyApi', {
    accessLog: false,
    ...(IS_PRODUCTION && {
      customDomain: {
        isExternalDomain: true,
        domainName: 'www.ambito-dolar.app',
        cdk: {
          certificate,
        },
      },
    }),
    routes: {
      'ANY /api/{proxy+}': {
        type: 'url',
        url: api.url + '/{proxy}',
      },
      // undefined on remove
      ...(landingSite.url && {
        $default: {
          type: 'url',
          url: landingSite.url,
        },
      }),
    },
  });
  // trace stack
  stack.addOutputs({
    ApiUrl: api.url,
    ...(api.cdk.domainName && {
      ApiRegionalDomainName: api.cdk.domainName.regionalDomainName,
    }),
    ScreenshotSiteUrl: screenshotSite.url,
    LandingSiteUrl: landingSite.url,
    LegacyApiUrl: legacyApi.url,
    ...(legacyApi.cdk.domainName && {
      LegacyApiRegionalDomainName: legacyApi.cdk.domainName.regionalDomainName,
    }),
  });
}
