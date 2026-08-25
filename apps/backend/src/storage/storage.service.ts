import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';
import crypto from 'crypto';

export class StorageService {
  private static s3Client = new S3Client({
    region: config.s3.region,
    endpoint: config.s3.endpoint,
    forcePathStyle: config.s3.forcePathStyle,
    credentials: {
      accessKeyId: config.s3.accessKey,
      secretAccessKey: config.s3.secretKey,
    },
  });

  public static async initBucket(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: config.s3.bucket }));
    } catch {
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: config.s3.bucket }));
        console.log(`[STORAGE] S3 Bucket '${config.s3.bucket}' créé avec succès.`);
      } catch (err) {
        console.warn(`[STORAGE] Erreur initialisation bucket S3:`, err);
      }
    }
  }

  public static async uploadFile(
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string
  ): Promise<{ storageKey: string; checksum: string }> {
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const safeExt = originalFileName.split('.').pop() || 'bin';
    const storageKey = `attachments/${new Date().getFullYear()}/${crypto.randomUUID()}.${safeExt}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: config.s3.bucket,
          Key: storageKey,
          Body: fileBuffer,
          ContentType: mimeType,
          Metadata: {
            sha256: checksum,
            originalName: encodeURIComponent(originalFileName),
          },
        })
      );
    } catch (err) {
      console.warn(`[STORAGE] S3 PutObject warning: ${err}`);
    }

    return { storageKey, checksum };
  }

  public static async getSignedDownloadUrl(storageKey: string, expiresInSeconds = 900): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: config.s3.bucket,
        Key: storageKey,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    } catch (err) {
      return `/api/v1/storage/fallback/${encodeURIComponent(storageKey)}`;
    }
  }
}
