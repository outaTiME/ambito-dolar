import {
  HttpLambdaAuthorizer,
  HttpLambdaResponseType,
} from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import * as sst from '@serverless-stack/resources';
import { Duration } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { LayerVersion } from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { SubscriptionFilter } from 'aws-cdk-lib/aws-sns';
import * as _ from 'lodash';

const getApiRoute = (method, name, authorize) => ({
  [`${method} /${name}`]: {
    ...(!process.env.IS_LOCAL &&
      authorize === true && {
        authorizationType: sst.ApiAuthorizationType.CUSTOM,
      }),
    function: {
      handler: `src/routes/${name}.handler`,
      // TODO: opts support ???
    },
  },
});

export default class Stack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const IS_PRODUCTION = scope.stage === 'prod';

    // existing resources

    const bucket =
      process.env.S3_BUCKET &&
      s3.Bucket.fromBucketName(this, 'Bucket', process.env.S3_BUCKET);

    const devicesTable =
      process.env.DEVICES_TABLE_NAME &&
      dynamodb.Table.fromTableName(
        this,
        'Devices',
        process.env.DEVICES_TABLE_NAME
      );

    const notificationsTable =
      process.env.NOTIFICATIONS_TABLE_NAME &&
      dynamodb.Table.fromTableName(
        this,
        'Notifications',
        process.env.NOTIFICATIONS_TABLE_NAME
      );

    // sns

    const topic = new sst.Topic(this, 'Topic');

    topic.addSubscribers(this, [
      {
        function: new sst.Function(this, 'ProcessSubscriber', {
          handler: 'src/subscribers/process.handler',
          environment: {
            SNS_TOPIC: topic.snsTopic.topicArn,
          },
          // ~30s
          timeout: Duration.minutes(1),
        }),
        subscriberProps: {
          filterPolicy: {
            event: SubscriptionFilter.stringFilter({
              whitelist: ['process'],
            }),
          },
        },
      },
      {
        function: new sst.Function(this, 'InvalidateReceiptsSubscriber', {
          handler: 'src/subscribers/invalidate-receipts.handler',
          // ~15s
          timeout: Duration.seconds(30),
        }),
        subscriberProps: {
          filterPolicy: {
            event: SubscriptionFilter.stringFilter({
              whitelist: ['invalidate-receipts'],
            }),
          },
        },
      },
      {
        function: new sst.Function(this, 'NotifySubscriber', {
          handler: 'src/subscribers/notify.handler',
          environment: {
            SNS_TOPIC: topic.snsTopic.topicArn,
          },
          // ~2m
          timeout: Duration.minutes(4),
        }),
        subscriberProps: {
          filterPolicy: {
            event: SubscriptionFilter.stringFilter({
              whitelist: ['notify'],
            }),
          },
        },
      },
      {
        function: new sst.Function(this, 'SocialNotifySubscriber', {
          handler: 'src/subscribers/social-notify.handler',
          bundle: {
            externalModules: ['chrome-aws-lambda'],
          },
          layers: [
            LayerVersion.fromLayerVersionArn(
              this,
              'ChromeLayer',
              process.env.CHROME_LAYER_ARN
            ),
          ],
          // ~30s
          timeout: Duration.minutes(1),
        }),
        subscriberProps: {
          filterPolicy: {
            event: SubscriptionFilter.stringFilter({
              whitelist: ['social-notify'],
            }),
          },
        },
      },
    ]);

    // remove falsey values
    topic.attachPermissions(
      _.compact([bucket, devicesTable, notificationsTable, topic])
    );

    // jobs

    if (IS_PRODUCTION) {
      // eslint-disable-next-line no-new
      new sst.Cron(this, 'Process', {
        job: {
          handler: 'src/jobs/process.handler',
          environment: {
            SNS_TOPIC: topic.snsTopic.topicArn,
          },
          permissions: [topic],
        },
        // 10hs to 17:55hs
        schedule: 'cron(0/5 13-20 ? * MON-FRI *)',
      });
      // eslint-disable-next-line no-new
      new sst.Cron(this, 'ProcessClose', {
        job: {
          handler: 'src/jobs/process-close.handler',
          environment: {
            SNS_TOPIC: topic.snsTopic.topicArn,
          },
          permissions: [topic],
        },
        // 18hs
        schedule: 'cron(0 21 ? * MON-FRI *)',
      });
      // eslint-disable-next-line no-new
      new sst.Cron(this, 'InvalidateReceipts', {
        job: {
          handler: 'src/jobs/invalidate-receipts.handler',
          environment: {
            SNS_TOPIC: topic.snsTopic.topicArn,
          },
          permissions: [topic],
        },
        // 19hs
        schedule: 'cron(0 22 ? * MON-FRI *)',
      });
    }

    // https://docs.serverless-stack.com/constructs/Api#adding-lambda-authorization-to-a-specific-route

    const authorizer = new sst.Function(this, 'Authorizer', {
      handler: 'src/authorizers/basic.handler',
    });

    // endpoints

    const api = new sst.Api(this, 'Api', {
      routes: {
        // private
        ...getApiRoute('GET', 'process', true),
        ...getApiRoute('GET', 'active-devices', true),
        ...getApiRoute('GET', 'prune-devices', true),
        ...getApiRoute('GET', 'notify', true),
        ...getApiRoute('GET', 'invalidate-receipts', true),
        ...getApiRoute('GET', 'social-notify', true),
        ...getApiRoute('POST', 'update-rates', true),
        // public
        ...getApiRoute('GET', 'test'),
        ...getApiRoute('GET', 'fetch'),
        ...getApiRoute('POST', 'register-device'),
      },
      /* cors: {
        allowHeaders: ["Authorization"],
      }, */
      accessLog: {
        retention: logs.RetentionDays.ONE_WEEK,
      },
      ...(IS_PRODUCTION && {
        customDomain: {
          isExternalDomain: true,
          domainName: `api.ambito-dolar.app`,
          certificate: Certificate.fromCertificateArn(
            this,
            'Certificate',
            process.env.DOMAIN_CERTIFICATE_ARN
          ),
        },
      }),
      defaultFunctionProps: {
        environment: {
          SNS_TOPIC: topic.snsTopic.topicArn,
        },
        // timeout: Duration.seconds(20),
      },
      // defaultAuthorizationType: sst.ApiAuthorizationType.CUSTOM,
      // https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpLambdaAuthorizer.html
      defaultAuthorizer: new HttpLambdaAuthorizer(
        'LambdaAuthorizer',
        authorizer,
        {
          // authorizerName: "LambdaAuthorizer"
          responseTypes: [HttpLambdaResponseType.SIMPLE],
          // resultsCacheTtl: Duration.seconds(0),
          // identitySource: ['$request.header.Authorization', '$request.querystring.access_token'],
          // identitySource: [],
        }
      ),
    });

    // remove falsey values
    api.attachPermissions(
      _.compact([bucket, devicesTable, notificationsTable, topic])
    );

    // show the endpoint in the output
    this.addOutputs({
      ApiUrl: api.url,
      ...(api.customDomainUrl && {
        ApiCustomDomainUrl: api.customDomainUrl,
        ApiTargetDomainName: api.apiGatewayDomain.regionalDomainName,
      }),
      // "BucketName": bucket.bucketName,
      // "DevicesTableName": devicesTable.tableName,
      // "NotificationsTableName": notificationsTable.tableName,
      // "TopicArn": topic.snsTopic.topicArn,
    });
  }
}
