const mysql = require('mysql2');
require('dotenv').config();

// Support BOTH Railway/Render-style DATABASE_URL (mysql://user:pass@host:port/db)
// and the classic individual DB_* env vars used locally on XAMPP.
function configFromDatabaseUrl(url) {
  if (!url || !url.startsWith('mysql://')) return null;
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: decodeURIComponent(u.pathname.replace(/^\//, '')),
      ssl: undefined,
    };
  } catch (err) {
    console.error('[db] invalid DATABASE_URL:', err.message);
    return null;
  }
}

const fromUrl = configFromDatabaseUrl(process.env.DATABASE_URL || process.env.MYSQL_URL);

// Some shared/external hosts (e.g. FreeSQLDatabase) cap concurrent
// connections tightly, so the pool size is configurable. Default to 10 for
// self-hosted XAMPP/MySQL, but allow operators to drop it (DB_POOL_LIMIT=3)
// on shared plans.
const poolLimit = Number(process.env.DB_POOL_LIMIT) || (fromUrl ? 5 : 10);

// External hosts (esp. FreeSQLDatabase) expect SSL for remote clients. Off by
// default so the local XAMPP setup keeps working with zero config.
const sslOpt = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1'
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
  // Keeps dead pooled connections from lingering during shared-host hiccups.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

const promisePool = pool.promise();

module.exports = promisePool;
