require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const http = require('http');
const db = require('../src/config/db');

function request(method, path) {
  const token = jwt.sign(
    { id: 4, email: 'kbtrinidad12@cityvet.com', role: 'Owner' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: { Authorization: `Bearer ${token}` },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const [insert] = await db.query(
    `INSERT INTO draft_registrations (pet_owner_id, temp_reg_info, device_id, payload, sync_state)
     VALUES (2, '{"name":"PostDeleteTest"}', 'test', '{"name":"PostDeleteTest"}', 'Draft')`,
  );
  const draftId = insert.insertId;
  console.log('created draft', draftId);

  const postDelete = await request('POST', `/api/drafts/${draftId}/delete`);
  console.log('POST delete', postDelete.status, postDelete.body);

  const [rows] = await db.query('SELECT id FROM draft_registrations WHERE id = ?', [draftId]);
  console.log('remaining', rows.length);
  process.exit(rows.length === 0 && postDelete.status === 200 ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
