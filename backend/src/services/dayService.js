import pool from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import dayjs from 'dayjs';
import { triggerSmsWorkerNow } from '../workers/smsWorker.js';

/**
 * Validates date rules according to user role:
 * Rule 4: No future dates. Collector can open only today and yesterday. Admin can open any past date.
 */
export function validateDateAccess(dateStr, user) {
  const targetDate = dayjs(dateStr);
  const today = dayjs().startOf('day');
  const target = targetDate.startOf('day');

  if (target.isAfter(today)) {
    const err = new Error('ভবিষ্যতের কোনো তারিখের কালেকশন শিট খোলা যাবে না।');
    err.status = 400;
    throw err;
  }

  if (user.role === 'collector') {
    const yesterday = today.subtract(1, 'day');
    if (target.isBefore(yesterday)) {
      const err = new Error('মাঠকর্মী শুধুমাত্র আজকের এবং গতকালের শিট দেখতে বা খুলতে পারেন।');
      err.status = 403;
      throw err;
    }
  }
}

/**
 * Helper to get settings as key-value map
 */
async function getSettingsMap(conn = pool) {
  const [rows] = await conn.query('SELECT `key`, `value` FROM settings');
  const map = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

/**
 * GET day by date: Opens existing or creates draft with active members (Rule 3)
 */
export async function getDayByDate(dateStr, user) {
  validateDateAccess(dateStr, user);

  return await withTransaction(async (conn) => {
    // Check if day exists
    const [dayRows] = await conn.query(
      `SELECT d.*, u.name as creator_name, c.name as confirmed_by_name
       FROM collection_days d
       LEFT JOIN users u ON u.id = d.created_by
       LEFT JOIN users c ON c.id = d.confirmed_by
       WHERE d.collect_date = ?`,
      [dateStr]
    );

    let day;

    if (dayRows.length === 0) {
      // Create new draft day (Rule 3)
      const [insertResult] = await conn.query(
        `INSERT INTO collection_days (collect_date, status, total_amount, created_by)
         VALUES (?, 'draft', 0, ?)`,
        [dateStr, user.id]
      );

      const dayId = insertResult.insertId;

      // Select all active members who joined on or before this date
      const [activeMembers] = await conn.query(
        `SELECT id, daily_amount FROM members
         WHERE status = 'active' AND joined_at <= ?
         ORDER BY id ASC`,
        [dateStr]
      );

      // Insert collection rows for each active member
      if (activeMembers.length > 0) {
        const values = activeMembers.map((m) => [
          dayId,
          m.id,
          m.daily_amount || 0,
          m.daily_amount || 0, // expected_amount = amount = members.daily_amount (Rule 3)
          null,
          user.id,
        ]);

        await conn.query(
          `INSERT INTO collections (day_id, member_id, expected_amount, amount, note, updated_by)
           VALUES ?`,
          [values]
        );
      }

      const [newDay] = await conn.query(
        `SELECT d.*, u.name as creator_name, NULL as confirmed_by_name
         FROM collection_days d
         LEFT JOIN users u ON u.id = d.created_by
         WHERE d.id = ?`,
        [dayId]
      );

      day = newDay[0];
    } else {
      day = dayRows[0];
    }

    // Retrieve collection rows joined with member info and total savings (Rule 2)
    const [collections] = await conn.query(
      `SELECT
        c.id,
        c.day_id,
        c.member_id,
        c.expected_amount,
        c.amount,
        c.note,
        c.updated_at,
        m.member_code,
        m.name AS member_name,
        m.phone AS member_phone,
        m.area,
        m.photo_path,
        (
          SELECT COALESCE(SUM(col.amount), 0)
          FROM collections col
          JOIN collection_days cd ON cd.id = col.day_id
          WHERE col.member_id = m.id AND cd.status = 'confirmed'
        ) AS total_savings,
        (
          SELECT MAX(cd.collect_date)
          FROM collections col
          JOIN collection_days cd ON cd.id = col.day_id
          WHERE col.member_id = m.id AND col.amount > 0 AND cd.status = 'confirmed'
        ) AS last_paid_date,
        s.status AS sms_status
       FROM collections c
       JOIN members m ON m.id = c.member_id
       LEFT JOIN sms_logs s ON s.day_id = c.day_id AND s.member_id = c.member_id
       WHERE c.day_id = ?
       ORDER BY m.id ASC`,
      [day.id]
    );

    // Retrieve corrections if any
    const [corrections] = await conn.query(
      `SELECT cc.*, u.name as corrector_name, m.name as member_name, m.member_code
       FROM collection_corrections cc
       JOIN collections c ON c.id = cc.collection_id
       JOIN members m ON m.id = c.member_id
       JOIN users u ON u.id = cc.corrected_by
       WHERE c.day_id = ?
       ORDER BY cc.id DESC`,
      [day.id]
    );

    // Calculate sheet totals
    let expectedTotal = 0;
    let collectedTotal = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    collections.forEach((r) => {
      expectedTotal += Number(r.expected_amount) || 0;
      collectedTotal += Number(r.amount) || 0;
      if (Number(r.amount) > 0) {
        paidCount++;
      } else {
        unpaidCount++;
      }
    });

    // SMS summary
    const [smsRows] = await conn.query(
      `SELECT status, COUNT(*) as count FROM sms_logs WHERE day_id = ? GROUP BY status`,
      [day.id]
    );
    const smsSummary = { pending: 0, sending: 0, sent: 0, failed: 0, total: 0 };
    smsRows.forEach((r) => {
      smsSummary[r.status] = r.count;
      smsSummary.total += r.count;
    });

    return {
      day,
      collections,
      corrections,
      smsSummary,
      totals: {
        expected_total: expectedTotal,
        collected_total: day.status === 'confirmed' ? Number(day.total_amount) : collectedTotal,
        total_members: collections.length,
        paid_count: paidCount,
        unpaid_count: unpaidCount,
      },
    };
  });
}

/**
 * Saves draft collections: PUT /api/days/:id/collections
 */
export async function updateCollections(dayId, items, userId) {
  return await withTransaction(async (conn) => {
    const [dayRows] = await conn.query(
      'SELECT status FROM collection_days WHERE id = ? FOR UPDATE',
      [dayId]
    );

    if (dayRows.length === 0) {
      const err = new Error('কালেকশন শিট খুঁজে পাওয়া যায়নি।');
      err.status = 404;
      throw err;
    }

    if (dayRows[0].status === 'confirmed') {
      const err = new Error('নিশ্চিত করা শিটের তথ্য খসড়া হিসেবে পরিবর্তন করা যাবে না।');
      err.status = 409;
      throw err;
    }

    // Update each collection item
    for (const item of items) {
      await conn.query(
        `UPDATE collections
         SET amount = ?, note = ?, updated_by = ?
         WHERE day_id = ? AND member_id = ?`,
        [item.amount, item.note || null, userId, dayId, item.member_id]
      );
    }

    return { success: true };
  });
}

/**
 * Adds any active members who joined <= collect_date but are not in this day's sheet (Rule 3)
 */
export async function addNewMembers(dayId, userId) {
  return await withTransaction(async (conn) => {
    const [dayRows] = await conn.query(
      'SELECT collect_date, status FROM collection_days WHERE id = ? FOR UPDATE',
      [dayId]
    );

    if (dayRows.length === 0) {
      const err = new Error('কালেকশন শিট পাওয়া যায়নি।');
      err.status = 404;
      throw err;
    }

    if (dayRows[0].status === 'confirmed') {
      const err = new Error('নিশ্চিত শিটে নতুন সদস্য যুক্ত করা যাবে না।');
      err.status = 409;
      throw err;
    }

    const collectDate = dayRows[0].collect_date;

    // Find missing members
    const [missingMembers] = await conn.query(
      `SELECT m.id, m.daily_amount FROM members m
       WHERE m.status = 'active' AND m.joined_at <= ?
         AND m.id NOT IN (SELECT member_id FROM collections WHERE day_id = ?)`,
      [collectDate, dayId]
    );

    if (missingMembers.length === 0) {
      return { added: 0, message: 'যুক্ত করার মতো কোনো নতুন সদস্য পাওয়া যায়নি।' };
    }

    const values = missingMembers.map((m) => [
      dayId,
      m.id,
      m.daily_amount || 0,
      m.daily_amount || 0,
      null,
      userId,
    ]);

    await conn.query(
      `INSERT INTO collections (day_id, member_id, expected_amount, amount, note, updated_by)
       VALUES ?`,
      [values]
    );

    return {
      added: missingMembers.length,
      message: `${missingMembers.length} জন নতুন সদস্য সফলভাবে শিটে যুক্ত করা হয়েছে।`,
    };
  });
}

/**
 * Confirms collection sheet: POST /api/days/:id/confirm (one transaction)
 * 1. SELECT day FOR UPDATE, verify status = 'draft'
 * 2. total = SUM(amount). UPDATE status='confirmed', total_amount, confirmed_by, confirmed_at=NOW()
 * 3. For each row with amount > 0: calculate member total (Rule 2), render SMS template, INSERT into sms_logs as pending
 * 4. COMMIT and return { total, smsQueued }
 */
export async function confirmDay(dayId, userId) {
  const result = await withTransaction(async (conn) => {
    const [dayRows] = await conn.query(
      'SELECT * FROM collection_days WHERE id = ? FOR UPDATE',
      [dayId]
    );

    if (dayRows.length === 0) {
      const err = new Error('কালেকশন শিট পাওয়া যায়নি।');
      err.status = 404;
      throw err;
    }

    const day = dayRows[0];
    if (day.status !== 'draft') {
      const err = new Error('এই দিনটির কালেকশন শিট ইতিমধ্যে নিশ্চিত করা হয়েছে।');
      err.status = 409;
      throw err;
    }

    // Compute sum of collected amounts
    const [sumRow] = await conn.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM collections WHERE day_id = ?',
      [dayId]
    );
    const totalAmount = Number(sumRow[0].total);

    // Update day to confirmed
    await conn.query(
      `UPDATE collection_days
       SET status = 'confirmed', total_amount = ?, confirmed_by = ?, confirmed_at = NOW()
       WHERE id = ?`,
      [totalAmount, userId, dayId]
    );

    // Read settings for SMS template
    const settings = await getSettingsMap(conn);
    const template =
      settings.sms_template ||
      '{name}, আজ {date} ৳{amount} জমা হয়েছে। আপনার মোট জমা ৳{total}। -{org}';
    const orgName = settings.org_short || settings.org_name || 'সবুজ বাংলা';

    // Get collection rows with amount > 0
    const [paidRows] = await conn.query(
      `SELECT c.member_id, c.amount, m.name, m.phone
       FROM collections c
       JOIN members m ON m.id = c.member_id
       WHERE c.day_id = ? AND c.amount > 0`,
      [dayId]
    );

    let smsQueued = 0;

    for (const row of paidRows) {
      // Calculate member's new total (Rule 2)
      // Since this day is now status='confirmed' inside the transaction, the SUM includes this day!
      const [totRow] = await conn.query(
        `SELECT COALESCE(SUM(c.amount), 0) as total
         FROM collections c
         JOIN collection_days d ON d.id = c.day_id
         WHERE c.member_id = ? AND d.status = 'confirmed'`,
        [row.member_id]
      );
      const memberTotal = Number(totRow[0].total);

      // Render template
      // {name}, আজ {date} ৳{amount} জমা হয়েছে। আপনার মোট জমা ৳{total}। -{org}
      const message = template
        .replace('{name}', row.name)
        .replace('{date}', day.collect_date)
        .replace('{amount}', Math.round(row.amount))
        .replace('{total}', Math.round(memberTotal))
        .replace('{org}', orgName);

      await conn.query(
        `INSERT INTO sms_logs (member_id, phone, message, status, attempts, next_try_at, day_id)
         VALUES (?, ?, ?, 'pending', 0, NOW(), ?)`,
        [row.member_id, row.phone, message, dayId]
      );

      smsQueued++;
    }

    return {
      total: totalAmount,
      smsQueued,
      message: 'কালেকশন শিট সফলভাবে নিশ্চিত করা হয়েছে।',
    };
  });

  // Trigger worker to process newly queued SMS immediately
  triggerSmsWorkerNow();

  return result;
}

/**
 * Corrects a confirmed collection row: POST /api/collections/:id/correct (Admin only, one transaction)
 * Rule 5: A confirmed day is read-only. Only an admin can correct one row:
 * insert into collection_corrections (old, new, reason), update amount, queue correction SMS with new total.
 */
export async function correctCollection(collectionId, newAmount, reason, userId) {
  return await withTransaction(async (conn) => {
    const [colRows] = await conn.query(
      `SELECT
        c.*,
        d.id as day_id,
        d.collect_date,
        d.status as day_status,
        m.name as member_name,
        m.phone as member_phone
       FROM collections c
       JOIN collection_days d ON d.id = c.day_id
       JOIN members m ON m.id = c.member_id
       WHERE c.id = ? FOR UPDATE`,
      [collectionId]
    );

    if (colRows.length === 0) {
      const err = new Error('কালেকশন রেকর্ড পাওয়া যায়নি।');
      err.status = 404;
      throw err;
    }

    const col = colRows[0];
    if (col.day_status !== 'confirmed') {
      const err = new Error('শুধুমাত্র নিশ্চিত (confirmed) শিটের তথ্যে সংশোধন প্রযোজ্য। খসড়া সরাসরি এডিট করা যায়।');
      err.status = 400;
      throw err;
    }

    const oldAmount = Number(col.amount);
    const parsedNewAmount = Number(newAmount);

    if (isNaN(parsedNewAmount) || parsedNewAmount < 0) {
      const err = new Error('সংশোধিত পরিমাণ অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।');
      err.status = 400;
      throw err;
    }

    // 1. Insert into collection_corrections
    await conn.query(
      `INSERT INTO collection_corrections (collection_id, old_amount, new_amount, reason, corrected_by)
       VALUES (?, ?, ?, ?, ?)`,
      [collectionId, oldAmount, parsedNewAmount, reason, userId]
    );

    // 2. Update collections amount
    await conn.query(
      `UPDATE collections
       SET amount = ?, updated_by = ?
       WHERE id = ?`,
      [parsedNewAmount, userId, collectionId]
    );

    // 3. Update collection_days total_amount
    const [newTotalRow] = await conn.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM collections WHERE day_id = ?',
      [col.day_id]
    );
    await conn.query(
      'UPDATE collection_days SET total_amount = ? WHERE id = ?',
      [Number(newTotalRow[0].total), col.day_id]
    );

    // 4. Calculate member's new total savings (Rule 2)
    const [totRow] = await conn.query(
      `SELECT COALESCE(SUM(c.amount), 0) as total
       FROM collections c
       JOIN collection_days d ON d.id = c.day_id
       WHERE c.member_id = ? AND d.status = 'confirmed'`,
      [col.member_id]
    );
    const updatedMemberTotal = Number(totRow[0].total);

    // 5. Queue correction SMS
    const settings = await getSettingsMap(conn);
    const orgName = settings.org_short || settings.org_name || 'সবুজ বাংলা';
    const correctionMessage = `${col.member_name}, আপনার ${col.collect_date} তারিখের জমার পরিমাণ সংশোধন করে ৳${Math.round(parsedNewAmount)} করা হয়েছে। বর্তমান মোট জমা ৳${Math.round(updatedMemberTotal)}। -${orgName}`;

    await conn.query(
      `INSERT INTO sms_logs (member_id, phone, message, status, attempts, next_try_at, day_id)
       VALUES (?, ?, ?, 'pending', 0, NOW(), ?)`,
      [col.member_id, col.member_phone, correctionMessage, col.day_id]
    );

    return {
      success: true,
      oldAmount,
      newAmount: parsedNewAmount,
      memberTotal: updatedMemberTotal,
      message: 'কালেকশন সফলভাবে সংশোধন করা হয়েছে এবং সংশোধিত SMS কিউতে যুক্ত করা হয়েছে।',
    };
  });
}

/**
 * Retries failed SMS for a specific day: POST /api/days/:id/retry-sms (Admin only)
 */
export async function retryDaySms(dayId) {
  const [result] = await pool.query(
    `UPDATE sms_logs
     SET status = 'pending', attempts = 0, next_try_at = NOW()
     WHERE day_id = ? AND status IN ('failed', 'sending')`,
    [dayId]
  );

  triggerSmsWorkerNow();

  return {
    affectedRows: result.affectedRows,
    message: `${result.affectedRows} টি ব্যর্থ SMS পুনরায় পাঠানোর জন্য প্রস্তুত করা হয়েছে।`,
  };
}
