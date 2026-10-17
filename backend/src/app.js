import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import pool from './db/pool.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import dayRoutes from './routes/dayRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: env.APP_URL,
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parsing for HTTP-only JWT
app.use(cookieParser());

// Static file serving for member photos and logo
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/days', dayRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let dbStatus = 'connected';
  let dbError = null;

  try {
    const [rows] = await pool.query('SELECT 1 as alive, NOW() as curr_time');
  } catch (err) {
    dbStatus = 'disconnected';
    dbError = err.message;
  }

  res.json({
    ok: dbStatus === 'connected',
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    message: 'সবুজ বাংলা সমবায় সমিতি লিঃ API সার্ভার সচল আছে',
    time: new Date().toISOString(),
    database: {
      status: dbStatus,
      ...(dbError ? { error: dbError } : {}),
    },
    env: env.NODE_ENV,
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || 500;
  const message = err.message || 'সার্ভারে একটি অভ্যন্তরীণ ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
  res.status(status).json({
    error: {
      message,
    },
  });
});

export default app;
