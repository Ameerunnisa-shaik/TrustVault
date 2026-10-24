import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'trustvault_dev_jwt_secret_change_in_production_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  cookieSecret: process.env.COOKIE_SECRET || 'trustvault_cookie_secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  storageDir: path.resolve(__dirname, '../', process.env.STORAGE_DIR || './private_storage'),
  maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES || '20971520', 10), // Default 20MB
};
