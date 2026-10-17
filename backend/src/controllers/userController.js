import bcrypt from 'bcrypt';
import { z } from 'zod';
import pool from '../db/pool.js';

export const createUserSchema = z.object({
  name: z.string().min(2, { message: 'নাম কমপক্ষে ২ অক্ষরের হতে হবে' }),
  phone: z.string().regex(/^01[3-9]\d{8}$/, { message: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন' }),
  password: z.string().min(6, { message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' }),
  role: z.enum(['admin', 'collector'], { message: 'ভূমিকা admin অথবা collector হতে হবে' }),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, { message: 'নাম কমপক্ষে ২ অক্ষরের হতে হবে' }),
  phone: z.string().regex(/^01[3-9]\d{8}$/, { message: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন' }),
  role: z.enum(['admin', 'collector'], { message: 'ভূমিকা admin অথবা collector হতে হবে' }),
  is_active: z.boolean().or(z.number()).transform((val) => (val ? 1 : 0)).optional(),
});

export const resetPasswordSchema = z.object({
  new_password: z.string().min(6, { message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' }),
});

/**
 * GET /api/users
 */
export async function getUsers(req, res) {
  const [rows] = await pool.query(
    `SELECT id, name, phone, role, is_active, must_change_password, token_version, last_login_at, created_at
     FROM users
     ORDER BY id ASC`
  );

  return res.json({
    users: rows.map((u) => ({
      ...u,
      is_active: Boolean(u.is_active),
      must_change_password: Boolean(u.must_change_password),
    })),
  });
}

/**
 * POST /api/users
 */
export async function createUser(req, res) {
  const { name, phone, password, role } = req.body;

  // Check unique phone
  const [existing] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
  if (existing.length > 0) {
    return res.status(409).json({
      error: {
        message: 'এই মোবাইল নম্বরটি দিয়ে ইতিমধ্যে একজন ব্যবহারকারী নিবন্ধিত আছেন।',
      },
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO users (name, phone, password_hash, role, is_active, must_change_password, token_version)
     VALUES (?, ?, ?, ?, 1, 1, 0)`,
    [name, phone, passwordHash, role]
  );

  return res.status(201).json({
    user: {
      id: result.insertId,
      name,
      phone,
      role,
      is_active: true,
      must_change_password: true,
    },
    message: 'নতুন ব্যবহারকারী সফলভাবে তৈরি হয়েছে।',
  });
}

/**
 * PUT /api/users/:id
 */
export async function updateUser(req, res) {
  const userId = parseInt(req.params.id, 10);
  const { name, phone, role, is_active } = req.body;

  // Check existence
  const [existing] = await pool.query('SELECT id, token_version, is_active FROM users WHERE id = ?', [userId]);
  if (existing.length === 0) {
    return res.status(404).json({
      error: {
        message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি।',
      },
    });
  }

  // Check phone uniqueness
  const [phoneMatch] = await pool.query(
    'SELECT id FROM users WHERE phone = ? AND id != ?',
    [phone, userId]
  );
  if (phoneMatch.length > 0) {
    return res.status(409).json({
      error: {
        message: 'এই মোবাইল নম্বরটি অন্য একজন ব্যবহারকারী ব্যবহার করছেন।',
      },
    });
  }

  // If deactivating user, increment token_version to invalidate active sessions
  const prevActive = existing[0].is_active;
  const newActive = is_active !== undefined ? (is_active ? 1 : 0) : prevActive;
  const shouldIncrementToken = prevActive === 1 && newActive === 0;

  await pool.query(
    `UPDATE users
     SET name = ?, phone = ?, role = ?, is_active = ?,
         token_version = token_version + ?
     WHERE id = ?`,
    [name, phone, role, newActive, shouldIncrementToken ? 1 : 0, userId]
  );

  return res.json({
    ok: true,
    message: 'ব্যবহারকারীর তথ্য সফলভাবে হালনাগাদ করা হয়েছে।',
  });
}

/**
 * POST /api/users/:id/reset-password
 */
export async function resetPassword(req, res) {
  const userId = parseInt(req.params.id, 10);
  const { new_password } = req.body;

  const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
  if (existing.length === 0) {
    return res.status(404).json({
      error: {
        message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি।',
      },
    });
  }

  const passwordHash = await bcrypt.hash(new_password, 10);

  // Increment token_version so any active sessions of this user are invalidated
  await pool.query(
    `UPDATE users
     SET password_hash = ?, must_change_password = 1, token_version = token_version + 1
     WHERE id = ?`,
    [passwordHash, userId]
  );

  return res.json({
    ok: true,
    message: 'পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে। ব্যবহারকারীকে পরবর্তী লগইনে পাসওয়ার্ড পরিবর্তন করতে হবে।',
  });
}
