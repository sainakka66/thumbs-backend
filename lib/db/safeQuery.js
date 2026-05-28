const logger = require('../logger');
const { getPool } = require('../db');
const { ValidationError } = require('../errors');

const DEFAULT_TIMEOUT_MS = parseInt(process.env.DB_QUERY_TIMEOUT_MS || '15000', 10);
const FORBIDDEN_SQL = /\b(load_file|into\s+outfile|into\s+dumpfile|benchmark\s*\(|sleep\s*\(|pg_sleep)\b/i;

function assertSafeSql(sql) {
  if (typeof sql !== 'string' || !sql.trim()) {
    throw new ValidationError('Invalid SQL statement');
  }
  if (FORBIDDEN_SQL.test(sql)) {
    throw new ValidationError('Forbidden SQL operation');
  }
  if (/\$\{|\+\s*['"]|`\s*\$/.test(sql)) {
    throw new Error('SQL must use parameterized placeholders only');
  }
}

function assertParams(params) {
  if (params == null) return [];
  if (!Array.isArray(params)) {
    throw new ValidationError('Query params must be an array');
  }
  return params;
}

async function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('DB_QUERY_TIMEOUT')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function query(sql, params = [], options = {}) {
  assertSafeSql(sql);
  const safeParams = assertParams(params);
  const pool = getPool();
  const start = Date.now();
  try {
    const result = await withTimeout(pool.query(sql, safeParams), options.timeoutMs);
    return result;
  } catch (err) {
    logger.error(
      {
        err: err.message,
        code: err.code,
        sqlPreview: sql.slice(0, 120),
        durationMs: Date.now() - start,
      },
      'db_query_error'
    );
    if (err.message === 'DB_QUERY_TIMEOUT') {
      const e = new Error('Database timeout');
      e.status = 503;
      e.code = 'DB_TIMEOUT';
      e.isOperational = true;
      throw e;
    }
    throw err;
  }
}

async function queryRows(sql, params = [], options = {}) {
  const [rows] = await query(sql, params, options);
  return rows;
}

async function withTransaction(fn) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const txQuery = async (sql, params = []) => {
      assertSafeSql(sql);
      const safeParams = assertParams(params);
      return conn.query(sql, safeParams);
    };
    const result = await fn({ query: txQuery, connection: conn });
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    logger.error({ err: err.message }, 'db_transaction_rollback');
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { query, queryRows, withTransaction, assertSafeSql, assertParams };
