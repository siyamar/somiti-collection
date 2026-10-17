import readline from 'readline';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

// Parse optional CLI args: --name=... --phone=... --password=...
function parseCliArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...vals] = arg.slice(2).split('=');
      args[key] = vals.join('=');
    }
  }
  return args;
}

async function seedAdmin() {
  console.log('\n👑 [এডমিন ব্যবহারকারী তৈরি / আপডেট]');
  console.log('-------------------------------------------');

  const cliArgs = parseCliArgs();

  let name = cliArgs.name;
  if (!name) {
    name = (await askQuestion('এডমিনের নাম (ডিফল্ট: প্রধান এডমিন): ')) || 'প্রধান এডমিন';
  }

  let phone = cliArgs.phone;
  while (!phone || !/^01[3-9]\d{8}$/.test(phone)) {
    phone = await askQuestion('১১ ডিজিটের মোবাইল নম্বর (যেমন: 01712345678): ');
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      console.log('⚠️ সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর প্রদান করুন (যেমন: 017xxxxxxxx)');
    }
  }

  let password = cliArgs.password;
  while (!password || password.length < 6) {
    password = await askQuestion('পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর): ');
    if (password.length < 6) {
      console.log('⚠️ পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!');
    }
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      charset: 'utf8mb4',
    });

    console.log('\n🔐 পাসওয়ার্ড হ্যাশ তৈরি হচ্ছে...');
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await connection.execute(
      `INSERT INTO users (name, phone, password_hash, role, is_active, must_change_password)
       VALUES (?, ?, ?, 'admin', 1, 0)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password_hash = VALUES(password_hash),
         role = 'admin',
         is_active = 1,
         must_change_password = 0,
         token_version = token_version + 1`,
      [name, phone, passwordHash]
    );

    console.log('🎉 এডমিন একাউন্ট সফলভাবে সংরক্ষিত হয়েছে!');
    console.log(`   👤 নাম: ${name}`);
    console.log(`   📱 মোবাইল: ${phone}`);
    console.log(`   🛡️ ভূমিকা: admin`);
    console.log('-------------------------------------------\n');
  } catch (error) {
    console.error('❌ এডমিন তৈরি করতে ব্যর্থ হয়েছে:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedAdmin();
