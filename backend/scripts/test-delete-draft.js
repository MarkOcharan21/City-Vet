require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('../src/config/db');
const { deleteDraft } = require('../src/controllers/draftController');

(async () => {
  const [insert] = await db.query(
    `INSERT INTO draft_registrations (pet_owner_id, temp_reg_info, device_id, payload, sync_state)
     VALUES (2, '{"name":"DeleteTest"}', 'test', '{"name":"DeleteTest"}', 'Draft')`,
  );
  const draftId = insert.insertId;
  console.log('created temp draft', draftId);

  const req = {
    user: { id: 4, email: 'kbtrinidad12@cityvet.com', role: 'Owner' },
    params: { id: String(draftId) },
  };

  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      console.log('response', this.statusCode || 200, body);
    },
  };

  await deleteDraft(req, res);

  const [rows] = await db.query('SELECT id FROM draft_registrations WHERE id = ?', [draftId]);
  console.log('remaining rows for deleted draft:', rows.length);

  process.exit(rows.length === 0 ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
