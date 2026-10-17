import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import pool from '../db/pool.js';

/**
 * Authentication middleware that verifies JWT from httpOnly cookie or Authorization header.
 * Reloads user from database and checks if active and if token_version matches.
 */
export async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/, '');

    if (!token) {
      return res.status(401).json({
        error: {
          message: 'লগইন করা আবশ্যক। অনুগ্রহ করে লগইন করুন।',
        },
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        error: {
          message: 'সেশনের মেয়াদ শেষ হয়েছে বা ত্রুটিপূর্ণ। পুনরায় লগইন করুন।',
        },
      });
    }

    const { sub: userId, tv: tokenVersion } = payload;

    const [rows] = await pool.query(
      `SELECT id, name, phone, role, is_active, must_change_password, token_version
       FROM users WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: {
          message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি।',
        },
      });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        error: {
          message: 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে। কর্তৃপক্ষের সাথে যোগাযোগ করুন।',
        },
      });
    }

    if (user.token_version !== tokenVersion) {
      return res.status(401).json({
        error: {
          message: 'পাসওয়ার্ড পরিবর্তন বা সেশন রিসেট হওয়ার কারণে পুনরায় লগইন করুন।',
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: {
        message: 'অনুমোদন যাচাই করতে সমস্যা হয়েছে।',
      },
    });
  }
}

/**
 * Role-based authorization middleware.
 * Checks whether the authenticated user has the required role (e.g. 'admin').
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'লগইন করা আবশ্যক।',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: 'এই কাজটি সম্পন্ন করার পর্যাপ্ত অনুমতি আপনার নেই।',
        },
      });
    }

    next();
  };
}

export const requireAdmin = requireRole('admin');
