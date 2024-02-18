import {
  PutObjectCommand as putObjectCommand,
  HeadObjectCommand as headObjectCommand,
  GetObjectCommand as getObjectCommand,
  DeleteObjectCommand as deleteObjectCommand,
} from '@aws-sdk/client-s3';
import chromium from '@sparticuz/chromium';
import prettyMilliseconds from 'pretty-ms';
import puppeteer from 'puppeteer-core';
import qrcode from 'qrcode-terminal';
import { AwsS3Store } from 'wwebjs-aws-s3';

import Shared, { S3_BUCKET } from '../shared';

// cjs format required by aws lambda layer
const { Client, RemoteAuth, MessageMedia } = require('whatsapp-web.js');

const getClient = async () => {
  // write permissions required for restore auth
  !process.env.IS_LOCAL && process.chdir('/tmp');
  // wwebjs with remote auth
  const s3Client = Shared.getS3Client();
  const store = new AwsS3Store({
    bucketName: S3_BUCKET,
    remoteDataPath: 'wwebjs',
    s3Client,
    putObjectCommand,
    headObjectCommand,
    getObjectCommand,
    deleteObjectCommand,
  });
  return new Client({
    puppeteer: {
      args: process.env.IS_LOCAL ? puppeteer.defaultArgs() : chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: process.env.IS_LOCAL
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : await chromium.executablePath(),
      headless: process.env.IS_LOCAL ? false : chromium.headless,
    },
    authStrategy: new RemoteAuth({
      // clientId: 'wwebjs-auth-session',
      // store on ephemeral storage
      dataPath: '/tmp/.wwebjs_auth',
      store,
      backupSyncIntervalMs: 1 * 60 * 60 * 1000, // 1 hour
    }),
    webVersionCache: {
      type: 'none',
    },
  });
};

// available in local mode to create and persist a session
export const handler = () =>
  new Promise(async (resolve) => {
    const start_time = Date.now();
    const client = await getClient();
    client.on('qr', (qr) => {
      console.info('QR code received', JSON.stringify({ qr }));
      qrcode.generate(qr, { small: true });
    });
    client.on('authenticated', () => {
      console.info('Authenticated');
    });
    client.on('auth_failure', (msg) => {
      // fired if session restore was unsuccessful
      console.error(
        'Authentication failed',
        JSON.stringify({
          error: msg,
        }),
      );
      resolve(
        Shared.serviceResponse(null, 400, {
          error: msg,
        }),
      );
    });
    client.on('remote_session_saved', () => {
      console.info('Session saved remotely on S3');
    });
    client.on('ready', () => {
      console.info('Initialization completed');
      const duration = Date.now() - start_time;
      resolve(
        Shared.serviceResponse(null, 200, {
          duration: prettyMilliseconds(duration),
        }),
      );
    });
    client.initialize();
  });

export const publish = (caption, image_url) =>
  new Promise(async (resolve, reject) => {
    // const start_time = Date.now();
    const client = await getClient();
    client.on('authenticated', () => {
      console.info('[WHATSAPP] Authenticated');
    });
    client.on('auth_failure', (msg) => {
      // fired if session restore was unsuccessful
      console.error(
        '[WHATSAPP] Authentication failed',
        JSON.stringify({
          error: msg,
        }),
      );
      reject(new Error(msg));
    });
    client.on('ready', async () => {
      console.info('[WHATSAPP] Initialization completed');
      const channelId = process.env.WHATSAPP_CHANNEL_ID;
      try {
        const media = image_url && (await MessageMedia.fromUrl(image_url));
        const { id: { id } = {}, type } = await client.sendMessage(
          channelId,
          caption,
          { ...(media && { media }) },
        );
        // const duration = Date.now() - start_time;
        resolve({
          id,
          type,
          // duration: prettyMilliseconds(duration),
        });
      } catch (error) {
        reject(error);
      }
    });
    client.initialize();
  });
