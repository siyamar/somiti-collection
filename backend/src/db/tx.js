import pool from './pool.js';

/**
 * Executes a callback within a managed MySQL database transaction.
 * Automatically handles BEGIN, COMMIT, ROLLBACK, and connection release.
 *
 * @template T
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withTransaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rollbackError) {
      console.error('Transaction rollback failed:', rollbackError);
    }
    throw error;
  } finally {
    conn.release();
  }
}

export default withTransaction;
