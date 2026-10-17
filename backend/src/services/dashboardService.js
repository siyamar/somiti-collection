import pool from '../db/pool.js';
import dayjs from 'dayjs';

/**
 * Service to aggregate dashboard metrics, 14-day history, SMS stats, and unpaid list.
 */
export async function getDashboardData(dateStr) {
  const targetDate = dateStr && dayjs(dateStr).isValid() ? dateStr : dayjs().format('YYYY-MM-DD');

  // 1. Fetch collection day for the selected date
  const [dayRows] = await pool.query(
    'SELECT id, collect_date, status, total_amount FROM collection_days WHERE collect_date = ?',
    [targetDate]
  );
  const day = dayRows[0] || null;

  // Rule 1: Only CONFIRMED days count in totals.
  const isConfirmed = day?.status === 'confirmed';
  const todayTotal = isConfirmed ? Number(day.total_amount) : 0;

  // 2. Active members count joined up to target date
  const [activeCountRow] = await pool.query(
    `SELECT COUNT(*) as total_members FROM members WHERE status = 'active' AND joined_at <= ?`,
    [targetDate]
  );
  const totalActiveMembers = Number(activeCountRow[0]?.total_members || 0);

  // 3. Paid members count on target date
  let paidMembersCount = 0;
  if (day) {
    const [paidRow] = await pool.query(
      `SELECT COUNT(*) as count FROM collections WHERE day_id = ? AND amount > 0`,
      [day.id]
    );
    paidMembersCount = Number(paidRow[0]?.count || 0);
  }

  // 4. Due 3+ days count using standard rule
  const [dueRows] = await pool.query(
    `SELECT COUNT(*) as due_count FROM (
      SELECT t.*, (SELECT COUNT(*) FROM collection_days d
          WHERE d.status='confirmed' AND d.collect_date >= t.joined_at
            AND (t.last_paid IS NULL OR d.collect_date > t.last_paid)) AS missed_days
      FROM (SELECT m.id, m.name, m.member_code, m.phone, m.area, m.joined_at,
              (SELECT MAX(d.collect_date) FROM collections c JOIN collection_days d ON d.id=c.day_id
                WHERE c.member_id=m.id AND c.amount>0 AND d.status='confirmed') AS last_paid
            FROM members m WHERE m.status='active') t
    ) x WHERE missed_days >= 3`,
    []
  );
  const due3PlusCount = Number(dueRows[0]?.due_count || 0);

  // 5. All-time total confirmed savings
  const [allTimeRow] = await pool.query(
    `SELECT COALESCE(SUM(total_amount), 0) as all_time_total
     FROM collection_days
     WHERE status = 'confirmed'`
  );
  const allTimeTotal = Number(allTimeRow[0]?.all_time_total || 0);

  // 6. Last 14 days collection trend
  const startDate = dayjs(targetDate).subtract(13, 'day').format('YYYY-MM-DD');
  const [recentDays] = await pool.query(
    `SELECT collect_date, status, total_amount
     FROM collection_days
     WHERE collect_date BETWEEN ? AND ?
     ORDER BY collect_date ASC`,
    [startDate, targetDate]
  );

  const dayMap = {};
  for (const d of recentDays) {
    dayMap[d.collect_date] = d;
  }

  const chart14Days = [];
  for (let i = 13; i >= 0; i--) {
    const curr = dayjs(targetDate).subtract(i, 'day');
    const currStr = curr.format('YYYY-MM-DD');
    const record = dayMap[currStr];
    chart14Days.push({
      date: currStr,
      day_number: curr.format('D'),
      display_date: curr.format('DD/MM'),
      day_name: curr.format('ddd'),
      status: record?.status || 'none',
      total: record && record.status === 'confirmed' ? Number(record.total_amount) : 0,
      is_current: currStr === targetDate,
    });
  }

  // 7. Today's SMS statistics
  const [smsStatsRow] = await pool.query(
    `SELECT
       COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
       COUNT(CASE WHEN status = 'sending' THEN 1 END) as sending,
       COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
     FROM sms_logs
     WHERE DATE(created_at) = ?`,
    [targetDate]
  );
  const smsStats = {
    sent: Number(smsStatsRow[0]?.sent || 0),
    pending: Number(smsStatsRow[0]?.pending || 0),
    sending: Number(smsStatsRow[0]?.sending || 0),
    failed: Number(smsStatsRow[0]?.failed || 0),
  };

  // 8. Unpaid members list on target date
  const [unpaidList] = await pool.query(
    `SELECT 
       m.id,
       m.name,
       m.member_code,
       m.phone,
       m.area,
       m.daily_amount,
       COALESCE(c.amount, 0) as paid_today
     FROM members m
     LEFT JOIN collections c ON c.member_id = m.id AND c.day_id = ?
     WHERE m.status = 'active'
       AND m.joined_at <= ?
       AND (c.amount IS NULL OR c.amount = 0)
     ORDER BY m.id ASC
     LIMIT 50`,
    [day?.id || null, targetDate]
  );

  return {
    date: targetDate,
    day_status: day?.status || 'unopened',
    day_id: day?.id || null,
    metrics: {
      today_total: todayTotal,
      paid_members: paidMembersCount,
      total_members: totalActiveMembers,
      paid_percentage: totalActiveMembers > 0 ? Math.round((paidMembersCount / totalActiveMembers) * 100) : 0,
      due_3plus_count: due3PlusCount,
      all_time_total: allTimeTotal,
    },
    chart_14_days: chart14Days,
    sms_stats: smsStats,
    unpaid_members: unpaidList,
  };
}
