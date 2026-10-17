import pool from '../db/pool.js';
import { triggerSmsWorkerNow } from '../workers/smsWorker.js';
import { getSettings } from './settingsService.js';

/**
 * Retrieves paginated SMS logs with member details and status filters
 */
export async function getSmsLogs({ status, page = 1, limit = 20 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];

  if (status && ['pending', 'sending', 'sent', 'failed'].includes(status)) {
    conditions.push('s.status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM sms_logs s ${whereClause}`,
    params
  );
  const total = Number(countResult[0]?.total || 0);

  // Fetch records
  const [rows] = await pool.query(
    `SELECT 
       s.id,
       s.member_id,
       s.phone,
       s.message,
       s.status,
       s.attempts,
       s.next_try_at,
       s.gateway_response,
       s.day_id,
       s.created_at,
       s.sent_at,
       m.name as member_name,
       m.member_code,
       cd.collect_date
     FROM sms_logs s
     LEFT JOIN members m ON m.id = s.member_id
     LEFT JOIN collection_days cd ON cd.id = s.day_id
     ${whereClause}
     ORDER BY s.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  return {
    items: rows,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Retries a single failed SMS by resetting its status to 'pending'
 */
export async function retrySms(smsId) {
  const [res] = await pool.query(
    `UPDATE sms_logs
     SET status = 'pending', attempts = 0, next_try_at = NOW()
     WHERE id = ?`,
    [smsId]
  );

  if (res.affectedRows === 0) {
    const err = new Error('SMS খুঁজে পাওয়া যায়নি।');
    err.status = 404;
    throw err;
  }

  triggerSmsWorkerNow();

  return {
    success: true,
    message: 'SMS পুনরায় পাঠানোর কিউতে যুক্ত করা হয়েছে।',
  };
}

/**
 * Retries all failed SMS messages for a specific collection day
 */
export async function retryDaySms(dayId) {
  const [res] = await pool.query(
    `UPDATE sms_logs
     SET status = 'pending', attempts = 0, next_try_at = NOW()
     WHERE day_id = ? AND status = 'failed'`,
    [dayId]
  );

  triggerSmsWorkerNow();

  return {
    success: true,
    retriedCount: res.affectedRows,
    message: `${res.affectedRows}টি ব্যর্থ SMS পুনরায় কিউতে যুক্ত করা হয়েছে।`,
  };
}

/**
 * Sends collection reminders to an array of member IDs
 */
export async function queueReminders({ memberIds }) {
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    const err = new Error('কমপক্ষে একজন সদস্য নির্বাচন করুন।');
    err.status = 400;
    throw err;
  }

  const [members] = await pool.query(
    `SELECT id, name, phone, member_code FROM members WHERE id IN (?) AND status = 'active'`,
    [memberIds]
  );

  if (members.length === 0) {
    const err = new Error('সক্রিয় সদস্য পাওয়া যায়নি।');
    err.status = 404;
    throw err;
  }

  const settings = await getSettings(false);
  const orgName = settings.org_short || settings.org_name || 'সবুজ বাংলা';

  let queued = 0;
  for (const m of members) {
    if (!m.phone) continue;
    const cleanPhone = m.phone.replace(/\D/g, '');
    const message = `${m.name}, সবুজ বাংলা সমবায় সমিতিতে আপনার দৈনিক সঞ্চয় জমা বকেয়া রয়েছে। অনুগ্রহ করে আপনার কিস্তি পরিশোধ করুন। -${orgName}`;

    await pool.query(
      `INSERT INTO sms_logs (member_id, phone, message, status, attempts, next_try_at)
       VALUES (?, ?, ?, 'pending', 0, NOW())`,
      [m.id, cleanPhone, message]
    );
    queued++;
  }

  triggerSmsWorkerNow();

  return {
    success: true,
    queuedCount: queued,
    message: `${queued} জন সদস্যের কাছে বকেয়া রিমাইন্ডার SMS কিউতে যুক্ত করা হয়েছে।`,
  };
}
