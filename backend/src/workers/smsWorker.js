import cron from 'node-cron';
import pool from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { sendSms } from '../services/sms/gateway.js';

let isWorkerRunning = false;
let cronTask = null;

/**
 * On server startup, reset any orphaned 'sending' logs back to 'pending'.
 * This prevents messages being permanently stuck if the server restarted while sending.
 */
export async function resetStaleSending() {
  try {
    const [res] = await pool.query(
      "UPDATE sms_logs SET status = 'pending' WHERE status = 'sending'"
    );
    if (res.affectedRows > 0) {
      console.log(`🔄 [SMS Worker] Reset ${res.affectedRows} stale 'sending' SMS log(s) back to 'pending'.`);
    }
  } catch (err) {
    console.error('❌ [SMS Worker] Failed to reset stale sending SMS:', err.message);
  }
}

/**
 * Executes a single processing tick of the pending SMS queue.
 * Concurrency guarded by `isWorkerRunning` flag.
 */
export async function processSmsQueue() {
  if (isWorkerRunning) {
    return;
  }

  isWorkerRunning = true;
  try {
    // 1. Check settings table for sms_enabled and gateway config
    const [settingsRows] = await pool.query(
      "SELECT `key`, `value` FROM settings WHERE `key` IN ('sms_enabled', 'sms_api_url', 'sms_api_key', 'sms_sender_id')"
    );
    const settings = {};
    for (const r of settingsRows) {
      settings[r.key] = r.value;
    }

    // Skip processing if SMS sending is globally toggled off
    if (settings.sms_enabled === '0') {
      return;
    }

    // 2. Atomically lock up to 60 pending rows and mark them as 'sending'
    const batch = await withTransaction(async (conn) => {
      const [rows] = await conn.query(
        `SELECT id, member_id, phone, message, attempts
         FROM sms_logs
         WHERE status = 'pending' AND next_try_at <= NOW()
         ORDER BY id ASC
         LIMIT 60
         FOR UPDATE SKIP LOCKED`
      );

      if (rows.length === 0) {
        return [];
      }

      const ids = rows.map((r) => r.id);
      await conn.query(
        `UPDATE sms_logs SET status = 'sending' WHERE id IN (?)`,
        [ids]
      );

      return rows;
    });

    if (batch.length === 0) {
      return;
    }

    console.log(`📨 [SMS Worker] Processing batch of ${batch.length} pending SMS message(s)...`);

    // 3. Process each message via the gateway
    for (const item of batch) {
      try {
        const result = await sendSms({
          phone: item.phone,
          message: item.message,
          settings,
        });

        await pool.query(
          `UPDATE sms_logs
           SET status = 'sent', sent_at = NOW(), gateway_response = ?
           WHERE id = ?`,
          [result.response || 'Success', item.id]
        );
        console.log(`✅ [SMS Worker] SMS #${item.id} successfully sent to ${item.phone}.`);
      } catch (sendErr) {
        const newAttempts = item.attempts + 1;
        const isFailed = newAttempts >= 3;
        const newStatus = isFailed ? 'failed' : 'pending';
        // Exponential backoff: 2^attempts minutes (e.g. 2 min, 4 min, 8 min)
        const delayMinutes = Math.pow(2, newAttempts);

        console.error(
          `⚠️ [SMS Worker] Failed sending SMS #${item.id} (Attempt ${newAttempts}/3): ${sendErr.message}`
        );

        await pool.query(
          `UPDATE sms_logs
           SET attempts = ?,
               status = ?,
               next_try_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
               gateway_response = ?
           WHERE id = ?`,
          [newAttempts, newStatus, delayMinutes, sendErr.message, item.id]
        );
      }
    }
  } catch (err) {
    console.error('❌ [SMS Worker] Unexpected worker error:', err);
  } finally {
    isWorkerRunning = false;
  }
}

/**
 * Triggers an immediate asynchronous queue run (useful after queuing test or confirmation SMS)
 */
export function triggerSmsWorkerNow() {
  setImmediate(() => {
    processSmsQueue().catch((err) => {
      console.error('Triggered SMS queue processing error:', err.message);
    });
  });
}

/**
 * Initializes and starts the background SMS cron worker (runs every minute).
 */
export async function startSmsWorker() {
  await resetStaleSending();

  // Run initial check at startup
  triggerSmsWorkerNow();

  // Schedule cron job: every minute (* * * * *)
  cronTask = cron.schedule('* * * * *', async () => {
    await processSmsQueue();
  });

  console.log('⏰ [SMS Worker] Node-cron SMS worker scheduled (runs every minute: * * * * *).');
  return cronTask;
}

/**
 * Stops the cron task during server shutdown.
 */
export function stopSmsWorker() {
  if (cronTask) {
    cronTask.stop();
    console.log('🛑 [SMS Worker] Node-cron worker stopped.');
  }
}
