const db = require('./src/config/db');

(async () => {
  try {
    const [qrCols] = await db.query("SHOW COLUMNS FROM qr_codes WHERE Field = 'id'");
    console.log('qr_codes.id:', JSON.stringify(qrCols[0]));

    const [tables] = await db.query(`
      SELECT AUTO_INCREMENT FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qr_codes'
    `);
    console.log('qr_codes AUTO_INCREMENT:', tables[0]?.AUTO_INCREMENT);

    const [qrRows] = await db.query(`
      SELECT qc.*, p.name, p.pet_code, po.user_id
      FROM qr_codes qc
      JOIN pets p ON qc.pet_id = p.id
      JOIN pet_owners po ON p.pet_owner_id = po.id
      ORDER BY qc.id DESC LIMIT 10
    `);
    console.log('Recent qr_codes:', JSON.stringify(qrRows, null, 2));

    const [zeroRows] = await db.query('SELECT * FROM qr_codes WHERE id = 0');
    console.log('id=0 rows:', zeroRows.length);

    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
