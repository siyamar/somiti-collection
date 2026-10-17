import pool from '../db/pool.js';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';

/**
 * Generates styling helper for Excel headers
 */
function applyHeaderStyle(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A4D2E' }, // Forest green
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
}

/**
 * 1. Daily Collection Report
 */
export async function getDailyReport({ date, format = 'json' }) {
  const targetDate = date && dayjs(date).isValid() ? date : dayjs().format('YYYY-MM-DD');

  const [dayRows] = await pool.query(
    'SELECT * FROM collection_days WHERE collect_date = ?',
    [targetDate]
  );
  const day = dayRows[0] || null;

  let items = [];
  if (day) {
    const [rows] = await pool.query(
      `SELECT
         c.id as collection_id,
         c.member_id,
         c.expected_amount,
         c.amount,
         c.note,
         m.name as member_name,
         m.member_code,
         m.phone as member_phone,
         m.area,
         (
           SELECT COALESCE(SUM(col.amount), 0)
           FROM collections col
           JOIN collection_days cd ON cd.id = col.day_id
           WHERE col.member_id = m.id AND cd.status = 'confirmed'
         ) AS total_savings
       FROM collections c
       JOIN members m ON m.id = c.member_id
       WHERE c.day_id = ?
       ORDER BY m.id ASC`,
      [day.id]
    );
    items = rows;
  }

  // Compute summary
  let expectedTotal = 0;
  let collectedTotal = 0;
  let paidCount = 0;

  for (const item of items) {
    expectedTotal += Number(item.expected_amount || 0);
    collectedTotal += Number(item.amount || 0);
    if (Number(item.amount) > 0) {
      paidCount++;
    }
  }

  const summary = {
    date: targetDate,
    day_status: day?.status || 'unopened',
    total_members: items.length,
    paid_members: paidCount,
    unpaid_members: items.length - paidCount,
    expected_total: expectedTotal,
    collected_total: collectedTotal,
    shortfall: Math.max(0, expectedTotal - collectedTotal),
  };

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'সবুজ বাংলা সমবায় সমিতি লিঃ';
    const sheet = workbook.addWorksheet('দৈনিক কালেকশন');

    sheet.columns = [
      { header: 'কোড', key: 'member_code', width: 14 },
      { header: 'সদস্যের নাম', key: 'member_name', width: 22 },
      { header: 'মোবাইল', key: 'member_phone', width: 16 },
      { header: 'এলাকা', key: 'area', width: 16 },
      { header: 'প্রত্যাশিত (৳)', key: 'expected_amount', width: 15 },
      { header: 'আদায় (৳)', key: 'amount', width: 15 },
      { header: 'মোট সঞ্চয় (৳)', key: 'total_savings', width: 18 },
      { header: 'মন্তব্য', key: 'note', width: 20 },
    ];

    applyHeaderStyle(sheet.getRow(1));

    items.forEach((item) => {
      sheet.addRow({
        member_code: item.member_code,
        member_name: item.member_name,
        member_phone: item.member_phone,
        area: item.area || '—',
        expected_amount: Number(item.expected_amount),
        amount: Number(item.amount),
        total_savings: Number(item.total_savings),
        note: item.note || '',
      });
    });

    // Total row at bottom
    const totalRow = sheet.addRow({
      member_code: 'মোট',
      member_name: `${paidCount}/${items.length} জন আদায়`,
      expected_amount: expectedTotal,
      amount: collectedTotal,
    });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return { isFile: true, buffer, filename: `daily_report_${targetDate}.xlsx` };
  }

  return { summary, items };
}

/**
 * 2. Monthly Collection Report
 */
export async function getMonthlyReport({ month, format = 'json' }) {
  const targetMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : dayjs().format('YYYY-MM');

  const [days] = await pool.query(
    `SELECT
       cd.id,
       cd.collect_date,
       cd.status,
       cd.total_amount,
       (SELECT COUNT(*) FROM collections c WHERE c.day_id = cd.id AND c.amount > 0) as paid_count,
       (SELECT COUNT(*) FROM collections c WHERE c.day_id = cd.id) as total_count
     FROM collection_days cd
     WHERE cd.collect_date LIKE ?
     ORDER BY cd.collect_date ASC`,
    [`${targetMonth}%`]
  );

  let monthlyTotal = 0;
  let confirmedDaysCount = 0;
  let totalPaymentsRecorded = 0;

  const items = days.map((d) => {
    const isConf = d.status === 'confirmed';
    const amount = isConf ? Number(d.total_amount) : 0;
    if (isConf) {
      monthlyTotal += amount;
      confirmedDaysCount++;
    }
    totalPaymentsRecorded += Number(d.paid_count);
    return {
      id: d.id,
      collect_date: d.collect_date,
      status: d.status,
      total_amount: amount,
      paid_count: Number(d.paid_count),
      total_count: Number(d.total_count),
    };
  });

  const summary = {
    month: targetMonth,
    monthly_total: monthlyTotal,
    confirmed_days: confirmedDaysCount,
    average_daily: confirmedDaysCount > 0 ? Math.round(monthlyTotal / confirmedDaysCount) : 0,
    total_collections_count: totalPaymentsRecorded,
  };

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'সবুজ বাংলা সমবায় সমিতি লিঃ';
    const sheet = workbook.addWorksheet('মাসিক রিপোর্ট');

    sheet.columns = [
      { header: 'তারিখ', key: 'collect_date', width: 16 },
      { header: 'স্ট্যাটাস', key: 'status_label', width: 14 },
      { header: 'আদায়কারী সদস্য', key: 'members_ratio', width: 20 },
      { header: 'মোট আদায় (৳)', key: 'total_amount', width: 18 },
    ];

    applyHeaderStyle(sheet.getRow(1));

    items.forEach((item) => {
      sheet.addRow({
        collect_date: item.collect_date,
        status_label: item.status === 'confirmed' ? 'নিশ্চিত' : 'খসড়া',
        members_ratio: `${item.paid_count} / ${item.total_count}`,
        total_amount: item.total_amount,
      });
    });

    const totalRow = sheet.addRow({
      collect_date: 'সর্বমোট',
      status_label: `${confirmedDaysCount} দিন নিশ্চিত`,
      total_amount: monthlyTotal,
    });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return { isFile: true, buffer, filename: `monthly_report_${targetMonth}.xlsx` };
  }

  return { summary, items };
}

/**
 * 3. Defaulters / Due List Report (বকেয়া তালিকা)
 */
export async function getDuesReport({ min_days = 3, area, format = 'json' }) {
  const minDaysNum = Math.max(1, parseInt(min_days, 10) || 3);

  const params = [minDaysNum];
  let areaClause = '';
  if (area && area.trim()) {
    areaClause = ' AND x.area = ?';
    params.push(area.trim());
  }

  const query = `
    SELECT * FROM (
      SELECT t.*, (SELECT COUNT(*) FROM collection_days d
          WHERE d.status='confirmed' AND d.collect_date >= t.joined_at
            AND (t.last_paid IS NULL OR d.collect_date > t.last_paid)) AS missed_days
      FROM (SELECT m.id, m.name, m.member_code, m.phone, m.area, m.joined_at, m.daily_amount,
              (SELECT MAX(d.collect_date) FROM collections c JOIN collection_days d ON d.id=c.day_id
                WHERE c.member_id=m.id AND c.amount>0 AND d.status='confirmed') AS last_paid,
              (SELECT COALESCE(SUM(c.amount), 0) FROM collections c JOIN collection_days d ON d.id=c.day_id
                WHERE c.member_id=m.id AND d.status='confirmed') AS total_savings
            FROM members m WHERE m.status='active') t
    ) x WHERE missed_days >= ? ${areaClause}
    ORDER BY missed_days DESC`;

  const [rows] = await pool.query(query, params);

  let totalDueAmount = 0;
  let count3to4 = 0;
  let count5to6 = 0;
  let count7Plus = 0;

  const items = rows.map((r) => {
    const missed = Number(r.missed_days);
    const dailyAmt = Number(r.daily_amount);
    const dueAmt = missed * dailyAmt;
    totalDueAmount += dueAmt;

    if (missed >= 7) count7Plus++;
    else if (missed >= 5) count5to6++;
    else if (missed >= 3) count3to4++;

    return {
      id: r.id,
      name: r.name,
      member_code: r.member_code,
      phone: r.phone,
      area: r.area,
      joined_at: r.joined_at,
      daily_amount: dailyAmt,
      last_paid: r.last_paid,
      missed_days: missed,
      total_due: dueAmt,
      total_savings: Number(r.total_savings),
    };
  });

  const summary = {
    total_defaulters: items.length,
    total_due_amount: totalDueAmount,
    count_3_to_4: count3to4,
    count_5_to_6: count5to6,
    count_7_plus: count7Plus,
  };

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'সবুজ বাংলা সমবায় সমিতি লিঃ';
    const sheet = workbook.addWorksheet('বকেয়া তালিকা');

    sheet.columns = [
      { header: 'কোড', key: 'member_code', width: 14 },
      { header: 'নাম', key: 'name', width: 20 },
      { header: 'মোবাইল', key: 'phone', width: 16 },
      { header: 'এলাকা', key: 'area', width: 16 },
      { header: 'দৈনিক কিস্তি (৳)', key: 'daily_amount', width: 15 },
      { header: 'বকেয়া দিন', key: 'missed_days', width: 12 },
      { header: 'সর্বশেষ জমা', key: 'last_paid', width: 14 },
      { header: 'মোট বকেয়া (৳)', key: 'total_due', width: 16 },
      { header: 'বর্তমান সঞ্চয় (৳)', key: 'total_savings', width: 18 },
    ];

    applyHeaderStyle(sheet.getRow(1));

    items.forEach((item) => {
      sheet.addRow({
        member_code: item.member_code,
        name: item.name,
        phone: item.phone,
        area: item.area || '—',
        daily_amount: item.daily_amount,
        missed_days: `${item.missed_days} দিন`,
        last_paid: item.last_paid || 'কখনও দেননি',
        total_due: item.total_due,
        total_savings: item.total_savings,
      });
    });

    const totalRow = sheet.addRow({
      member_code: 'মোট',
      name: `${items.length} জন বকেয়া`,
      total_due: totalDueAmount,
    });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return { isFile: true, buffer, filename: `due_list_min_${minDaysNum}_days.xlsx` };
  }

  return { summary, items };
}

/**
 * 4. Member Statement (সদস্য হিসাব বিবরণী)
 */
export async function getMemberStatement({ memberId, from, to, format = 'json' }) {
  const [memberRows] = await pool.query(
    'SELECT id, name, member_code, phone, area, daily_amount, joined_at, photo_path FROM members WHERE id = ?',
    [memberId]
  );

  if (memberRows.length === 0) {
    const err = new Error('সদস্য খুঁজে পাওয়া যায়নি।');
    err.status = 404;
    throw err;
  }
  const member = memberRows[0];

  const params = [memberId];
  let dateFilter = '';
  if (from) {
    dateFilter += ' AND cd.collect_date >= ?';
    params.push(from);
  }
  if (to) {
    dateFilter += ' AND cd.collect_date <= ?';
    params.push(to);
  }

  // Running balance transaction ledger
  const [txRows] = await pool.query(
    `SELECT
       c.id,
       cd.collect_date,
       c.amount,
       c.note,
       SUM(c.amount) OVER (ORDER BY cd.collect_date ASC, c.id ASC) AS balance
     FROM collections c
     JOIN collection_days cd ON cd.id = c.day_id
     WHERE c.member_id = ?
       AND cd.status = 'confirmed'
       AND c.amount > 0
       ${dateFilter}
     ORDER BY cd.collect_date ASC, c.id ASC`,
    params
  );

  // Total savings across all confirmed days
  const [totRow] = await pool.query(
    `SELECT COALESCE(SUM(c.amount), 0) as total
     FROM collections c
     JOIN collection_days cd ON cd.id = c.day_id
     WHERE c.member_id = ? AND cd.status = 'confirmed'`,
    [memberId]
  );
  const totalSavings = Number(totRow[0]?.total || 0);

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'সবুজ বাংলা সমবায় সমিতি লিঃ';
    const sheet = workbook.addWorksheet('সদস্য হিসাব বিবরণী');

    sheet.columns = [
      { header: 'তারিখ', key: 'collect_date', width: 16 },
      { header: 'জমা (৳)', key: 'amount', width: 15 },
      { header: 'স্থিতি (৳)', key: 'balance', width: 18 },
      { header: 'মন্তব্য', key: 'note', width: 25 },
    ];

    applyHeaderStyle(sheet.getRow(1));

    txRows.forEach((tx) => {
      sheet.addRow({
        collect_date: tx.collect_date,
        amount: Number(tx.amount),
        balance: Number(tx.balance),
        note: tx.note || '',
      });
    });

    const totalRow = sheet.addRow({
      collect_date: 'সর্বমোট স্থিতি',
      balance: totalSavings,
    });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      isFile: true,
      buffer,
      filename: `statement_${member.member_code}_${dayjs().format('YYYY-MM-DD')}.xlsx`,
    };
  }

  return {
    member: {
      ...member,
      total_savings: totalSavings,
    },
    filter: { from: from || null, to: to || null },
    transactions: txRows.map((t) => ({
      ...t,
      amount: Number(t.amount),
      balance: Number(t.balance),
    })),
  };
}
