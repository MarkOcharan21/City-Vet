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

const pool = mysql.createPool(
  fromUrl || {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  }
);

const promisePool = pool.promise();

module.exports = promisePool;
