import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🔄 [ডাটাবেস মাইগ্রেশন শুরু হচ্ছে...]');
  console.log(`📡 Connecting to MySQL: ${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      multipleStatements: true,
      charset: 'utf8mb4',
    });

    const sqlPath = path.resolve(__dirname, '../migrations/001_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 Executing 001_schema.sql...');
    await connection.query(sql);

    // Verify created tables
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map((t) => Object.values(t)[0]);

    console.log('✅ মাইগ্রেশন সফলভাবে সম্পন্ন হয়েছে!');
    console.log('📋 ডাটাবেস টেবিলসমূহ:');
    tableNames.forEach((t) => console.log(`   - ${t}`));

    // Verify settings
    const [settings] = await connection.query('SELECT `key`, `value` FROM settings');
    console.log(`⚙️ প্রাথমিক সেটিংস লোড করা হয়েছে (${settings.length} টি কনফিগ)`);

  } catch (error) {
    console.error('❌ মাইগ্রেশন ব্যর্থ হয়েছে:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('⚠️ অনুগ্রহ করে backend/.env ফাইলে সঠিক MySQL ইউজারনেম এবং পাসওয়ার্ড কনফিগার করুন।');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`⚠️ ডাটাবেস "${env.DB_NAME}" পাওয়া যায়নি। অনুগ্রহ করে ডাটাবেসটি তৈরি করুন।`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
