import pool from '../db/pool.js';
import { withTransaction } from '../db/tx.js';

/**
 * Generates next sequential member code (M-0001, M-0002...) using settings table lock
 * @param {import('mysql2/promise').PoolConnection} conn
 * @returns {Promise<string>}
 */
export async function getNextMemberCode(conn) {
  const [rows] = await conn.query(
    "SELECT `value` FROM settings WHERE `key` = 'member_code_next' FOR UPDATE"
  );

  let nextNum = 1;
  if (rows.length > 0 && rows[0].value) {
    nextNum = parseInt(rows[0].value, 10) || 1;
  }

  // Format code as M-0001, M-0002, etc.
  const formattedCode = `M-${String(nextNum).padStart(4, '0')}`;

  // Increment next member code in settings
  await conn.query(
    "UPDATE settings SET `value` = ? WHERE `key` = 'member_code_next'",
    [String(nextNum + 1)]
  );

  return formattedCode;
}

/**
 * Creates a new member with transaction and automated member code generation
 */
export async function createMember(memberData, createdBy) {
  return await withTransaction(async (conn) => {
    // Check if phone already registered
    const [existing] = await conn.query(
      'SELECT id, member_code, name FROM members WHERE phone = ?',
      [memberData.phone]
    );

    if (existing.length > 0) {
      const err = new Error(`এই মোবাইল নম্বরটি (${memberData.phone}) ইতিমধ্যে সদস্য ${existing[0].name} (${existing[0].member_code}) এর জন্য ব্যবহৃত হয়েছে।`);
      err.status = 409;
      throw err;
    }

    // Check NID if provided
    if (memberData.nid) {
      const [nidExisting] = await conn.query(
        'SELECT id, member_code, name FROM members WHERE nid = ?',
        [memberData.nid]
      );
      if (nidExisting.length > 0) {
        const err = new Error(`এই NID নম্বরটি (${memberData.nid}) ইতিমধ্যে সদস্য ${nidExisting[0].name} (${nidExisting[0].member_code}) এর জন্য ব্যবহৃত হয়েছে।`);
        err.status = 409;
        throw err;
      }
    }

    const memberCode = await getNextMemberCode(conn);

    const [result] = await conn.query(
      `INSERT INTO members (
        member_code, name, phone, nid, area, address,
        nominee_name, nominee_phone, daily_amount, photo_path,
        status, joined_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        memberCode,
        memberData.name,
        memberData.phone,
        memberData.nid || null,
        memberData.area,
        memberData.address || null,
        memberData.nominee_name || null,
        memberData.nominee_phone || null,
        memberData.daily_amount || 0,
        memberData.photo_path || null,
        memberData.joined_at,
        createdBy,
      ]
    );

    return {
      id: result.insertId,
      member_code: memberCode,
      ...memberData,
      status: 'active',
      created_by: createdBy,
    };
  });
}

/**
 * Retrieves members with search, filters, pagination and calculated total savings
 */
export async function getMembers({ q, area, status, page = 1, limit = 15 }) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const conditions = [];
  const params = [];

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push('(m.name LIKE ? OR m.member_code LIKE ? OR m.phone LIKE ? OR m.nid LIKE ?)');
    params.push(term, term, term, term);
  }

  if (area && area.trim()) {
    conditions.push('m.area = ?');
    params.push(area.trim());
  }

  if (status && status !== 'all') {
    conditions.push('m.status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching
  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM members m ${whereClause}`,
    params
  );
  const total = countResult[0].total;

  // Retrieve members with calculated savings (Rule 2)
  const query = `
    SELECT
      m.id,
      m.member_code,
      m.name,
      m.phone,
      m.nid,
      m.area,
      m.address,
      m.nominee_name,
      m.nominee_phone,
      m.daily_amount,
      m.photo_path,
      m.status,
      m.joined_at,
      m.created_at,
      u.name AS creator_name,
      (
        SELECT COALESCE(SUM(c.amount), 0)
        FROM collections c
        JOIN collection_days d ON d.id = c.day_id
        WHERE c.member_id = m.id AND d.status = 'confirmed'
      ) AS total_savings,
      (
        SELECT MAX(d.collect_date)
        FROM collections c
        JOIN collection_days d ON d.id = c.day_id
        WHERE c.member_id = m.id AND c.amount > 0 AND d.status = 'confirmed'
      ) AS last_paid_date
    FROM members m
    LEFT JOIN users u ON u.id = m.created_by
    ${whereClause}
    ORDER BY m.id DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(query, [...params, parseInt(limit, 10), offset]);

  // Also get quick stats (total active, total inactive)
  const [statsRows] = await pool.query(`
    SELECT
      COUNT(*) AS total_count,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_count,
      SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_count
    FROM members
  `);

  return {
    members: rows,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
    },
    stats: {
      total: statsRows[0]?.total_count || 0,
      active: statsRows[0]?.active_count || 0,
      inactive: statsRows[0]?.inactive_count || 0,
    },
  };
}

/**
 * Retrieves a single member by ID with calculated total savings and collection stats
 */
export async function getMemberById(id) {
  const query = `
    SELECT
      m.*,
      u.name AS creator_name,
      (
        SELECT COALESCE(SUM(c.amount), 0)
        FROM collections c
        JOIN collection_days d ON d.id = c.day_id
        WHERE c.member_id = m.id AND d.status = 'confirmed'
      ) AS total_savings,
      (
        SELECT COUNT(*)
        FROM collections c
        JOIN collection_days d ON d.id = c.day_id
        WHERE c.member_id = m.id AND c.amount > 0 AND d.status = 'confirmed'
      ) AS total_paid_days,
      (
        SELECT MAX(d.collect_date)
        FROM collections c
        JOIN collection_days d ON d.id = c.day_id
        WHERE c.member_id = m.id AND c.amount > 0 AND d.status = 'confirmed'
      ) AS last_paid_date
    FROM members m
    LEFT JOIN users u ON u.id = m.created_by
    WHERE m.id = ?
  `;

  const [rows] = await pool.query(query, [id]);
  if (rows.length === 0) {
    const err = new Error('সদস্য খুঁজে পাওয়া যায়নি।');
    err.status = 404;
    throw err;
  }

  return rows[0];
}

/**
 * Updates member info
 */
export async function updateMember(id, data) {
  const member = await getMemberById(id);

  // Check unique phone for other members
  if (data.phone && data.phone !== member.phone) {
    const [existing] = await pool.query(
      'SELECT id, name FROM members WHERE phone = ? AND id != ?',
      [data.phone, id]
    );
    if (existing.length > 0) {
      const err = new Error(`এই মোবাইল নম্বরটি অন্য সদস্যের (${existing[0].name}) জন্য ব্যবহৃত হয়েছে।`);
      err.status = 409;
      throw err;
    }
  }

  // Check unique NID
  if (data.nid && data.nid !== member.nid) {
    const [nidExisting] = await pool.query(
      'SELECT id, name FROM members WHERE nid = ? AND id != ?',
      [data.nid, id]
    );
    if (nidExisting.length > 0) {
      const err = new Error(`এই NID নম্বরটি অন্য সদস্যের (${nidExisting[0].name}) জন্য ব্যবহৃত হয়েছে।`);
      err.status = 409;
      throw err;
    }
  }

  await pool.query(
    `UPDATE members SET
      name = ?,
      phone = ?,
      nid = ?,
      area = ?,
      address = ?,
      nominee_name = ?,
      nominee_phone = ?,
      daily_amount = ?,
      photo_path = COALESCE(?, photo_path),
      joined_at = ?
    WHERE id = ?`,
    [
      data.name,
      data.phone,
      data.nid || null,
      data.area,
      data.address || null,
      data.nominee_name || null,
      data.nominee_phone || null,
      data.daily_amount,
      data.photo_path || null,
      data.joined_at,
      id,
    ]
  );

  return await getMemberById(id);
}

/**
 * Updates member status (Rule 7: Never delete, set inactive)
 */
export async function updateMemberStatus(id, status) {
  await getMemberById(id);

  if (!['active', 'inactive'].includes(status)) {
    const err = new Error('স্ট্যাটাস শুধুমাত্র active অথবা inactive হতে পারে।');
    err.status = 400;
    throw err;
  }

  await pool.query('UPDATE members SET status = ? WHERE id = ?', [status, id]);
  return { id, status };
}

/**
 * Returns member transactions with running total via SQL SUM() OVER
 */
export async function getMemberTransactions(memberId, from, to) {
  await getMemberById(memberId);

  const conditions = [
    'c.member_id = ?',
    "d.status = 'confirmed'",
  ];
  const params = [memberId];

  if (from) {
    conditions.push('d.collect_date >= ?');
    params.push(from);
  }

  if (to) {
    conditions.push('d.collect_date <= ?');
    params.push(to);
  }

  const query = `
    SELECT
      t.*
    FROM (
      SELECT
        d.id AS day_id,
        d.collect_date,
        c.id AS collection_id,
        c.expected_amount,
        c.amount,
        c.note,
        c.updated_at,
        SUM(c.amount) OVER (
          ORDER BY d.collect_date ASC, c.id ASC
        ) AS running_total
      FROM collections c
      JOIN collection_days d ON d.id = c.day_id
      WHERE c.member_id = ? AND d.status = 'confirmed'
    ) t
    ${from || to ? `WHERE ${from ? 't.collect_date >= ?' : ''} ${from && to ? 'AND' : ''} ${to ? 't.collect_date <= ?' : ''}` : ''}
    ORDER BY t.collect_date DESC, t.collection_id DESC
  `;

  // We build params for inner and outer if filtering
  const queryParams = [memberId];
  if (from) queryParams.push(from);
  if (to) queryParams.push(to);

  const [rows] = await pool.query(query, queryParams);
  return rows;
}

/**
 * Retrieves all distinct areas
 */
export async function getAreas() {
  const [rows] = await pool.query(
    `SELECT DISTINCT area FROM members WHERE area IS NOT NULL AND area != '' ORDER BY area ASC`
  );
  return rows.map((r) => r.area);
}
