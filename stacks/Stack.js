import * as sst from '@serverless-stack/resources';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { SubscriptionFilter } from 'aws-cdk-lib/aws-sns';

export function Stack({ stack }) {
  const IS_PRODUCTION = stack.stage === 'prod';
  // existing resources
  const bucket = s3.Bucket.fromBucketName(
    stack,
    'Bucket',
    process.env.S3_BUCKET
  );
  const devicesTable = dynamodb.Table.fromTableName(
    stack,
    'Devices',
    process.env.DEVICES_TABLE_NAME
  );
  const notificationsTable = dynamodb.Table.fromTableName(
    stack,
    'Notifications',
    process.env.NOTIFICATIONS_TABLE_NAME
  );
  const certificate = Certificate.fromCertificateArn(
    stack,
    'ApiCertificate',
    process.env.DOMAIN_CERTIFICATE_ARN
  );
  // expo web build
  const quotesSite = new sst.StaticSite(stack, 'QuotesSite', {
    buildCommand: 'yarn expo export:web',
    buildOutput: 'web-build',
    environment: {
      IS_PRODUCTION: IS_PRODUCTION.toString(),
    },
    path: 'packages/client',
  });
  // sns
  const topic = new sst.Topic(stack, 'Topic');
  topic.addSubscribers(stack, {
    process: {
      function: {
        handler: 'src/subscribers/process.handler',
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
        handler: 'src/subscribers/invalidate-receipts.handler',
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
        handler: 'src/subscribers/notify.handler',
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
        handler: 'src/subscribers/social-notify.handler',
        bundle: {
          externalModules: ['@sparticuz/chrome-aws-lambda', 'sharp'],
        },
        environment: {
          SOCIAL_SCREENSHOT_URL: quotesSite.url,
        },
        layers: [process.env.CHROME_LAYER_ARN, process.env.SHARP_LAYER_ARN],
        // ~30s
        timeout: '1 minute',
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
  });
  topic.attachPermissions([bucket, devicesTable, notificationsTable, topic]);
  // jobs
  // eslint-disable-next-line no-new
  new sst.Cron(stack, 'Process', {
    job: {
      function: {
        handler: 'src/jobs/process.handler',
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
  new sst.Cron(stack, 'ProcessClose', {
    job: {
      function: {
        handler: 'src/jobs/process-close.handler',
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
  new sst.Cron(stack, 'InvalidateReceipts', {
    job: {
      function: {
        handler: 'src/jobs/invalidate-receipts.handler',
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
  // api endpoints
  const api = new sst.Api(stack, 'Api', {
    accessLog: false,
    authorizers: {
      basicAuthorizer: {
        function: new sst.Function(stack, 'Authorizer', {
          handler: 'src/authorizers/basic.handler',
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
        // timeout: '20 seconds',
      },
    },
    routes: {
      // private
      'GET /process': 'src/routes/process.handler',
      'GET /active-devices': 'src/routes/active-devices.handler',
      'GET /prune-devices': 'src/routes/prune-devices.handler',
      'GET /notify': 'src/routes/notify.handler',
      'GET /invalidate-receipts': 'src/routes/invalidate-receipts.handler',
      'GET /social-notify': 'src/routes/social-notify.handler',
      'POST /update-rates': 'src/routes/update-rates.handler',
      'POST /update-historical-rates':
        'src/routes/update-historical-rates.handler',
      // public
      'GET /test': {
        authorizer: 'none',
        function: 'src/routes/test.handler',
      },
      'GET /fetch': {
        authorizer: 'none',
        function: 'src/routes/fetch.handler',
      },
      'POST /register-device': {
        authorizer: 'none',
        function: 'src/routes/register-device.handler',
      },
    },
  });
  api.attachPermissions([bucket, devicesTable, notificationsTable, topic]);
  // landing page with accesss to legacy api
  const landingSite = new sst.StaticSite(stack, 'LandingSite', {
    buildCommand: 'yarn build',
    buildOutput: 'public',
    errorPage: 'redirect_to_index_page',
    path: 'packages/website',
    // waitForInvalidation: IS_PRODUCTION,
  });
  const legacyApi = new sst.Api(stack, 'LegacyApi', {
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
      $default: {
        type: 'url',
        url: landingSite.url,
      },
    },
  });
  // trace stack
  stack.addOutputs({
    ApiUrl: api.url,
    ...(api.cdk.domainName && {
      ApiRegionalDomainName: api.cdk.domainName.regionalDomainName,
    }),
    QuotesSiteUrl: quotesSite.url,
    LandingSiteUrl: landingSite.url,
    LegacyApiUrl: legacyApi.url,
    ...(legacyApi.cdk.domainName && {
      LegacyApiRegionalDomainName: legacyApi.cdk.domainName.regionalDomainName,
    }),
  });
}
