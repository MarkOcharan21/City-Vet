const db = require('../src/config/db');

(async () => {
  const [owners] = await db.query('SELECT * FROM pet_owners');
  const [drafts] = await db.query('SELECT * FROM draft_registrations');
  const [users] = await db.query("SELECT id, email, role FROM users WHERE role = 'Owner'");
  console.log('owners', JSON.stringify(owners, null, 2));
  console.log('drafts', JSON.stringify(drafts, null, 2));
  console.log('users', JSON.stringify(users, null, 2));
  process.exit(0);
})();
