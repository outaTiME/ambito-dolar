import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { SubscriptionFilter } from 'aws-cdk-lib/aws-sns';
import { Api, Function, StaticSite, Topic, Cron } from 'sst/constructs';

export function MainStack({ stack /*, app */ }) {
  const IS_PRODUCTION = stack.stage === 'prod';
  // const IS_LOCAL = app.local === true;
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
  const topic = new Topic(stack, 'Topic');
  topic.attachPermissions([bucket, devicesTable, notificationsTable, topic]);
  // eslint-disable-next-line no-new
  new Cron(stack, 'Process', {
    job: {
      function: {
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        handler: 'packages/api/src/jobs/process.handler',
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
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        handler: 'packages/api/src/jobs/process-close.handler',
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
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        handler: 'packages/api/src/jobs/invalidate-receipts.handler',
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
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        handler: 'packages/api/src/jobs/funding-notify.handler',
        permissions: [topic],
      },
    },
    // last day of month (23:59hs) (for full month stats)
    schedule: 'cron(59 2 1 * ? *)',
    enabled: IS_PRODUCTION,
  });
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
  // expo web build
  const screenshotSite = new StaticSite(stack, 'ScreenshotSite', {
    buildCommand: 'yarn expo export:web',
    buildOutput: 'web-build',
    environment: {
      IS_PRODUCTION: IS_PRODUCTION.toString(),
      // should use API_URL but expo web overwrites it
      SST_API_URL: api.url,
    },
    path: 'packages/client',
  });
  topic.addSubscribers(stack, {
    process: {
      function: {
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        handler: 'packages/api/src/subscribers/process.handler',
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
        environment: {
          SNS_TOPIC: topic.topicArn,
        },
        handler: 'packages/api/src/subscribers/notify.handler',
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
        environment: {
          SOCIAL_SCREENSHOT_URL: screenshotSite.url,
        },
        handler: 'packages/api/src/subscribers/social-notify.handler',
        layers: [
          process.env.CHROME_LAYER_ARN,
          process.env.SHARP_LAYER_ARN,
          // process.env.WWEBJS_LAYER_ARN,
        ],
        nodejs: {
          esbuild: {
            external: [
              '@sparticuz/chromium',
              'sharp',
              // 'whatsapp-web.js'
            ],
          },
        },
        // ~2m
        timeout: '4 minutes',
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
        environment: {
          SOCIAL_SCREENSHOT_URL: screenshotSite.url,
        },
        handler: 'packages/api/src/subscribers/funding-notify.handler',
        layers: [process.env.CHROME_LAYER_ARN, process.env.SHARP_LAYER_ARN],
        nodejs: {
          esbuild: {
            external: ['@sparticuz/chromium', 'sharp'],
          },
        },
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
  /* const createWhatsAppSessionFn =
    IS_LOCAL &&
    new Function(stack, 'CreateWhatsAppSession', {
      handler: 'packages/api/src/libs/social/whatsapp.handler',
      layers: [process.env.CHROME_LAYER_ARN, process.env.WWEBJS_LAYER_ARN],
      nodejs: {
        esbuild: {
          external: ['@sparticuz/chromium', 'whatsapp-web.js'],
        },
      },
      permissions: [bucket],
      // ~2m
      timeout: '4 minutes',
      url: true,
    }); */
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
    /* ...(createWhatsAppSessionFn && {
      CreateWhatsAppSession: createWhatsAppSessionFn.url,
    }), */
  });
}
