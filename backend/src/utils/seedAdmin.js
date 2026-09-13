// Run this once after importing schema.sql: `npm run seed`
// It creates a default Admin login so you're not locked out on Day 1.
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seedAdmin() {
  const email = 'admin@cityvet.gov.ph';
  const plainPassword = 'Admin123!';

  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    console.log('Admin account already exists. Skipping.');
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  await db.query(
    'INSERT INTO users (role_id, role, email, password, status, full_name) VALUES (?, ?, ?, ?, ?, ?)',
    [4, 'Admin', email, hashedPassword, 'active', 'System Administrator']
  );

  console.log('Admin account created!');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${plainPassword}`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
