import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

/**
 * MySQL connection pool configured according to project specifications:
 * - decimalNumbers: true (ensures DECIMAL(12,2) returns as JavaScript numbers)
 * - dateStrings: ['DATE'] (returns DATE columns formatted as YYYY-MM-DD instead of UTC Date objects)
 * - timezone: '+06:00' (Bangladesh Standard Time BST)
 */
export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  decimalNumbers: true,
  dateStrings: ['DATE'],
  timezone: '+06:00',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

export default pool;
