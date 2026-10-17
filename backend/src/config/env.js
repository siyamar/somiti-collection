import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Enforce Asia/Dhaka timezone across Node.js runtime
process.env.TZ = 'Asia/Dhaka';

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  APP_URL: process.env.APP_URL || 'http://localhost:5173',

  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: process.env.DB_USER || 'jomakhata',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'jomakhata',

  JWT_SECRET: process.env.JWT_SECRET || 'sobuj_bangla_secret_key_default_change_in_env',

  SMS_DRIVER: process.env.SMS_DRIVER || 'fake',
  SMS_API_URL: process.env.SMS_API_URL || '',
  SMS_API_KEY: process.env.SMS_API_KEY || '',
  SMS_SENDER_ID: process.env.SMS_SENDER_ID || '',
};
