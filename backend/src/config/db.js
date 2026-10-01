const mysql = require('mysql2');
const { Pool } = require('pg');
const { createExecutor } = require('./pgCompat');
require('dotenv').config();

/**
 * Driver selection
 * ----------------
 *   DATABASE_URL / DATABASE_URL_POOLER = postgresql://...  -> PostgreSQL (Supabase)
 *   otherwise, or DB_TYPE=postgres                           -> PostgreSQL
 *   DB_TYPE=mysql                                            -> MySQL (fallback)
 *
 * Supabase's direct host (db.<ref>.supabase.co) is IPv6-only, so DATABASE_URL_POOLER
 * points at Supavisor (aws-0-<region>.pooler.supabase.com:5432). Port 5432 is
 * required rather than 6543: this app uses real multi-statement transactions
 * via getConnection(), which transaction-mode pooling cannot support.
 *
 * MySQL stays fully supported. Switch back by unsetting DATABASE_URL_POOLER /
 * DATABASE_URL and setting DB_TYPE=mysql.
 */

function resolveUrl() {
  return process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL || process.env.MYSQL_URL;
}

function isPostgresUrl(url) {
  return typeof url === 'string' && /^postgres(ql)?:\/\//i.test(url);
}

const url = resolveUrl();
const isPostgres =
  isPostgresUrl(url) || (process.env.DB_TYPE || '').toLowerCase() === 'postgres';

if (isPostgres) {
  if (!isPostgresUrl(url)) {
    throw new Error(
      `[db] DB_TYPE=postgres but no postgresql:// URL found (DATABASE_URL_POOLER / DATABASE_URL). Current value: ${url}`
    );
  }

  const pool = new Pool({
    connectionString: url,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_LIMIT) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });

  // a pool-level error must not take the process down
  pool.on('error', (err) => {
    console.error('[db] idle client error:', err.message);
  });

  const exec = createExecutor(pool);
  exec.dialect = 'postgres';
  module.exports = exec;
} else {
  function configFromDatabaseUrl(raw) {
    if (!raw || !raw.startsWith('mysql://')) return null;
    try {
      const u = new URL(raw);
      return {
        host: u.hostname,
        port: u.port ? Number(u.port) : 3306,
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: decodeURIComponent(u.pathname.replace(/^\//, '')),
        ssl: undefined,
      };
    } catch (err) {
      console.error('[db] invalid database URL:', err.message);
      return null;
    }
  }

  const fromUrl = configFromDatabaseUrl(url);
  const poolLimit = Number(process.env.DB_POOL_LIMIT) || (fromUrl ? 5 : 10);
  const sslOpt =
    process.env.DB_SSL === 'true' || process.env.DB_SSL === '1'
      ? { ssl: { rejectUnauthorized: false } }
      : {};

  const pool = mysql.createPool({
    ...(fromUrl || {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    }),
    ...sslOpt,
    waitForConnections: true,
    connectionLimit: poolLimit,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  const promisePool = pool.promise();
  promisePool.dialect = 'mysql';
  module.exports = promisePool;
}