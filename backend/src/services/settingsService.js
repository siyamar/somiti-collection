import pool from '../db/pool.js';
import { triggerSmsWorkerNow } from '../workers/smsWorker.js';

/**
 * Mask API key for secure presentation
 * e.g. 'secret_key_12345' -> '••••••••••••2345'
 */
function maskApiKey(key) {
  if (!key) return '';
  if (key.length <= 4) return '••••••••';
  const last4 = key.slice(-4);
  return '••••••••••••' + last4;
}

/**
 * Get all application settings as an object map.
 * Masks sensitive credentials when requested.
 */
export async function getSettings(maskSecrets = true) {
  const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
  const settings = {};

  for (const r of rows) {
    settings[r.key] = r.value ?? '';
  }

  // Set intelligent defaults if keys are missing
  if (!settings.org_name) settings.org_name = 'সবুজ বাংলা সমবায় সমিতি লিঃ';
  if (!settings.org_short) settings.org_short = 'সবুজ বাংলা';
  if (!settings.logo_path) settings.logo_path = '/logo.png';
  if (!settings.sms_enabled) settings.sms_enabled = '1';
  if (!settings.sms_template) {
    settings.sms_template = '{name}, আজ {date} ৳{amount} জমা হয়েছে। আপনার মোট জমা ৳{total}। -{org}';
  }

  if (maskSecrets && settings.sms_api_key) {
    settings.sms_api_key = maskApiKey(settings.sms_api_key);
  }

  return settings;
}

/**
 * Update system settings in key-value table.
 * Only modifies recognized configuration keys.
 */
export async function updateSettings(updates = {}) {
  const allowedKeys = [
    'org_name',
    'org_short',
    'org_address',
    'org_phone',
    'sms_enabled',
    'sms_api_url',
    'sms_api_key',
    'sms_sender_id',
    'sms_template',
  ];

  for (const key of allowedKeys) {
    if (updates[key] !== undefined) {
      let val = updates[key];

      // If the incoming API key is still the masked string (e.g. starts with •••), do not overwrite!
      if (key === 'sms_api_key') {
        if (typeof val === 'string' && val.includes('•••')) {
          continue; // keep existing key
        }
      }

      await pool.query(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
        [key, val !== null ? String(val) : '']
      );
    }
  }

  return await getSettings(true);
}

/**
 * Updates the organization's logo path in settings
 */
export async function updateLogoPath(logoPath) {
  await pool.query(
    'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    ['logo_path', logoPath]
  );
  return { logo_path: logoPath };
}

/**
 * Queues a test SMS message into sms_logs and triggers the background worker
 */
export async function queueTestSms({ phone, customMessage = null }) {
  const cleanPhone = String(phone).replace(/\D/g, '');
  if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
    const err = new Error('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712345678)।');
    err.status = 400;
    throw err;
  }

  const settings = await getSettings(false);
  const orgName = settings.org_short || settings.org_name || 'সবুজ বাংলা';
  const message =
    customMessage ||
    `[টেস্ট SMS] সবুজ বাংলা সমবায় সমিতি লিঃ এর SMS গেটওয়ে সফলভাবে সংযোগ হয়েছে। ধন্যবাদ! -${orgName}`;

  const [res] = await pool.query(
    `INSERT INTO sms_logs (phone, message, status, attempts, next_try_at)
     VALUES (?, ?, 'pending', 0, NOW())`,
    [cleanPhone, message]
  );

  // Trigger worker immediately to send test SMS without waiting for next cron minute
  triggerSmsWorkerNow();

  return {
    success: true,
    smsId: res.insertId,
    phone: cleanPhone,
    message: 'টেস্ট SMS সফলভাবে কিউতে যুক্ত করা হয়েছে। কিছুক্ষণের মধ্যেই ডেলিভারি হবে।',
  };
}
