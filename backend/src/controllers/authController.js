import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import pool from '../db/pool.js';
import { env } from '../config/env.js';

// Zod schemas for Auth
export const loginSchema = z.object({
  phone: z.string().regex(/^01[3-9]\d{8}$/, { message: '১১ ডিজিটের সঠিক মোবাইল নম্বর দিন' }),
  password: z.string().min(1, { message: 'পাসওয়ার্ড প্রদান করুন' }),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, { message: 'বর্তমান পাসওয়ার্ড দিন' }),
  new_password: z.string().min(6, { message: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' }),
});

/**
 * Login rate limiter: 5 tries per 15 minutes per phone + IP address
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const phone = req.body?.phone || 'unknown';
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    return `${phone}_${ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: 'অতিরিক্ত চেষ্টার কারণে লগইন সাময়িকভাবে স্থগিত করা হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন।',
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Creates and sets httpOnly authentication cookie
 */
function setAuthCookie(res, userId, tokenVersion) {
  const token = jwt.sign(
    { sub: userId, tv: tokenVersion },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  return token;
}

/**
 * POST /api/auth/login
 */
export async function login(req, res) {
  const { phone, password } = req.body;

  const [rows] = await pool.query(
    `SELECT id, name, phone, password_hash, role, is_active, must_change_password, token_version
     FROM users WHERE phone = ?`,
    [phone]
  );

  if (rows.length === 0) {
    return res.status(401).json({
      error: {
        message: 'মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।',
      },
    });
  }

  const user = rows[0];

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({
      error: {
        message: 'মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।',
      },
    });
  }

  if (!user.is_active) {
    return res.status(403).json({
      error: {
        message: 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে। কর্তৃপক্ষের সাথে যোগাযোগ করুন।',
      },
    });
  }

  // Update last login timestamp
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  // Set httpOnly cookie
  setAuthCookie(res, user.id, user.token_version);

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      must_change_password: Boolean(user.must_change_password),
    },
  });
}

/**
 * POST /api/auth/logout
 */
export async function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return res.json({
    ok: true,
    message: 'সফলভাবে লগআউট হয়েছে।',
  });
}

/**
 * GET /api/auth/me
 */
export async function me(req, res) {
  const user = req.user;
  return res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      must_change_password: Boolean(user.must_change_password),
    },
  });
}

/**
 * POST /api/auth/change-password
 */
export async function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  const [rows] = await pool.query(
    'SELECT password_hash, token_version FROM users WHERE id = ?',
    [userId]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      error: {
        message: 'ব্যবহারকারী পাওয়া যায়নি।',
      },
    });
  }

  const user = rows[0];
  const match = await bcrypt.compare(current_password, user.password_hash);
  if (!match) {
    return res.status(400).json({
      error: {
        message: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।',
      },
    });
  }

  const newHash = await bcrypt.hash(new_password, 10);
  const nextTokenVersion = (user.token_version || 0) + 1;

  await pool.query(
    `UPDATE users
     SET password_hash = ?, must_change_password = 0, token_version = ?
     WHERE id = ?`,
    [newHash, nextTokenVersion, userId]
  );

  // Issue refreshed token
  setAuthCookie(res, userId, nextTokenVersion);

  return res.json({
    ok: true,
    message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।',
  });
}
