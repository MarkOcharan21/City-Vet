const db = require('./src/config/db');

async function createTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS mobile_scan_sessions (
        session_id VARCHAR(64) PRIMARY KEY,
        pet_data JSON NOT NULL,
        scan_mode VARCHAR(20) DEFAULT 'single',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table mobile_scan_sessions created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    process.exit(0);
  }
}

createTable();