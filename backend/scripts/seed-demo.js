import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

async function seedDemoData() {
  console.log('🌱 [ডেমো সদস্য ও তথ্য সিডিং শুরু হচ্ছে...]');

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

    // Get admin user id
    const [users] = await connection.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (users.length === 0) {
      console.error('❌ কোনো এডমিন ব্যবহারকারী পাওয়া যায়নি। অনুগ্রহ করে আগে "npm run seed:admin" চালান।');
      process.exit(1);
    }
    const adminId = users[0].id;

    // Check if members already exist
    const [existingMembers] = await connection.query('SELECT COUNT(*) as count FROM members');
    if (existingMembers[0].count > 0) {
      console.log(`ℹ️ ইতিমধ্যে ${existingMembers[0].count} জন সদস্য ডাটাবেসে বিদ্যমান রয়েছে।`);
    } else {
      console.log('👤 ১০ জন বাস্তবসম্মত সদস্য যুক্ত করা হচ্ছে...');

      const demoMembers = [
        {
          code: 'M-0001',
          name: 'রহিমা বেগম',
          phone: '01711234567',
          nid: '19852691234567890',
          area: 'পদ্মা মহিলা সমিতি',
          address: 'গোবিন্দপুর, ধামরাই, ঢাকা',
          nominee_name: 'করিম মিয়া',
          nominee_phone: '01711234568',
          daily_amount: 50,
          status: 'active',
          joined_at: '2025-01-04',
        },
        {
          code: 'M-0002',
          name: 'আছিয়া খাতুন',
          phone: '01819445566',
          nid: '19882699876543210',
          area: 'পদ্মা মহিলা সমিতি',
          address: 'দক্ষিণপাড়া, ধামরাই, ঢাকা',
          nominee_name: 'আব্দুস সোবহান',
          nominee_phone: '01819445567',
          daily_amount: 50,
          status: 'active',
          joined_at: '2025-01-10',
        },
        {
          code: 'M-0003',
          name: 'ফাতেমা আক্তার',
          phone: '01912789012',
          nid: '19922695555444333',
          area: 'পদ্মা মহিলা সমিতি',
          address: 'উত্তরপাড়া, ধামরাই',
          nominee_name: 'মোবারক হোসেন',
          nominee_phone: '01912789013',
          daily_amount: 30,
          status: 'active',
          joined_at: '2025-02-01',
        },
        {
          code: 'M-0004',
          name: 'শাহানা পারভীন',
          phone: '01670112233',
          nid: '19902693333222111',
          area: 'যমুনা সমিতি',
          address: 'বাজার রোড, ধামরাই',
          nominee_name: 'রফিকুল ইসলাম',
          nominee_phone: '01670112234',
          daily_amount: 100,
          status: 'active',
          joined_at: '2025-02-15',
        },
        {
          code: 'M-0005',
          name: 'মরিয়ম বিবি',
          phone: '01552908070',
          nid: '19822698888777666',
          area: 'যমুনা সমিতি',
          address: 'কালামপুর, ধামরাই',
          nominee_name: 'আলমগীর হোসেন',
          nominee_phone: '01552908071',
          daily_amount: 50,
          status: 'active',
          joined_at: '2025-03-01',
        },
        {
          code: 'M-0006',
          name: 'রাশেদা বেগম',
          phone: '01744567890',
          nid: '19872691111000999',
          area: 'শাপলা সমিতি',
          address: 'কুশুরা, ধামরাই',
          nominee_name: 'জাহাঙ্গীর আলম',
          nominee_phone: '01744567891',
          daily_amount: 50,
          status: 'active',
          joined_at: '2025-03-10',
        },
        {
          code: 'M-0007',
          name: 'নাসিমা আক্তার',
          phone: '01310227044',
          nid: '19942697777888999',
          area: 'শাপলা সমিতি',
          address: 'গাঙ্গুটিয়া, ধামরাই',
          nominee_name: 'তৌহিদুর রহমান',
          nominee_phone: '01310227045',
          daily_amount: 50,
          status: 'active',
          joined_at: '2025-04-05',
        },
        {
          code: 'M-0008',
          name: 'জোবেদা খাতুন',
          phone: '01988665544',
          nid: '19802694444555666',
          area: 'মেঘনা সমিতি',
          address: 'সোমভাগ, ধামরাই',
          nominee_name: 'হারুন অর রশীদ',
          nominee_phone: '01988665545',
          daily_amount: 30,
          status: 'active',
          joined_at: '2025-04-20',
        },
        {
          code: 'M-0009',
          name: 'সালমা বেগম',
          phone: '01700120123',
          nid: '19952692222333444',
          area: 'মেঘনা সমিতি',
          address: 'রোয়াইল, ধামরাই',
          nominee_name: 'মো. শাহীন',
          nominee_phone: '01700120124',
          daily_amount: 30,
          status: 'inactive',
          joined_at: '2025-05-01',
        },
        {
          code: 'M-0010',
          name: 'কুলসুম বিবি',
          phone: '01855334455',
          nid: '19862696666555444',
          area: 'কৃষ্ণচূড়া সমিতি',
          address: 'সুয়াপুর, ধামরাই',
          nominee_name: 'বিল্লাল হোসেন',
          nominee_phone: '01855334456',
          daily_amount: 50,
          status: 'active',
          joined_at: '2025-05-15',
        },
      ];

      for (const m of demoMembers) {
        await connection.query(
          `INSERT INTO members (
            member_code, name, phone, nid, area, address,
            nominee_name, nominee_phone, daily_amount, status,
            joined_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            m.code,
            m.name,
            m.phone,
            m.nid,
            m.area,
            m.address,
            m.nominee_name,
            m.nominee_phone,
            m.daily_amount,
            m.status,
            m.joined_at,
            adminId,
          ]
        );
      }

      // Update next member code in settings
      await connection.query(
        "UPDATE settings SET `value` = '11' WHERE `key` = 'member_code_next'"
      );

      console.log('✅ ১০ জন সদস্য সফলভাবে তৈরি হয়েছে!');
    }

    console.log('🎉 ডেমো সিডিং সম্পন্ন হয়েছে!\n');
  } catch (error) {
    console.error('❌ ডেমো সিডিং ব্যর্থ হয়েছে:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDemoData();
