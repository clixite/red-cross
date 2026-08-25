import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://sfs_user:sfs_secure_pass_2025@localhost:5432/sfs_portail?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-for-sfs-portal-at-least-32-chars-long!',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  invitationTokenExpiresInHours: parseInt(process.env.INVITATION_TOKEN_EXPIRES_IN_HOURS || '72', 10),

  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'eu-west-1',
    bucket: process.env.S3_BUCKET || 'sfs-portal-attachments',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin123',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  },

  qualios: {
    adapter: (process.env.QUALIOS_ADAPTER || 'manual') as 'rest' | 'file' | 'manual',
    baseUrl: process.env.QUALIOS_BASE_URL || 'http://localhost:4010/api/v1',
    apiKey: process.env.QUALIOS_API_KEY || 'qualios_live_secret_key_sfs_demo',
    fileExchangePath: process.env.QUALIOS_FILE_EXCHANGE_PATH || './data/qualios_exchange',
    syncIntervalSec: parseInt(process.env.QUALIOS_SYNC_INTERVAL_SEC || '15', 10),
  },

  antivirus: {
    enabled: process.env.ANTIVIRUS_ENABLED === 'true',
    mockMode: process.env.ANTIVIRUS_MOCK_MODE !== 'false',
  },

  email: {
    simulationMode: process.env.EMAIL_SIMULATION_MODE !== 'false',
    from: process.env.SMTP_FROM || 'Service du Sang - Qualité <qualite-service-du-sang@croix-rouge-demo.be>',
  },
};
