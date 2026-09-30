const db = require('../config/db');
const { logAudit } = require('../middleware/auditMiddleware');

// GET /api/regimens  (Staff/Vet/Admin — the consultation quick templates)
async function listRegimens(req, res) {
  try {
    const [regimens] = await db.query(
      `SELECT id, name, complaint, diagnosis, treatment, sort_order
       FROM condition_regimens
       WHERE active = 1
       ORDER BY sort_order ASC, name ASC`
    );

    if (regimens.length === 0) {
      return res.json({ success: true, regimens: [] });
    }

    const [items] = await db.query(
      `SELECT
         ri.regimen_id,
         ri.medicine_id,
         ri.dosage,
         ri.frequency,
         ri.duration,
         ri.instructions,
         m.medicine_name,
         m.category,
         m.default_dosage,
         m.default_frequency,
         m.default_duration,
         m.default_instructions
       FROM condition_regimen_items ri
       JOIN condition_regimens r ON r.id = ri.regimen_id
       JOIN medicines m ON m.id = ri.medicine_id
       WHERE r.active = 1
       ORDER BY ri.regimen_id ASC, ri.sort_order ASC, ri.id ASC`
    );

    // Group the flat join result per regimen, dropping the join bookkeeping.
    const byRegimen = new Map();
    items.forEach((row) => {
      if (!byRegimen.has(row.regimen_id)) byRegimen.set(row.regimen_id, []);
      byRegimen.get(row.regimen_id).push({
        medicine_id: row.medicine_id,
        medicine_name: row.medicine_name,
        category: row.category,
        // Per-regimen values win; anything NULL falls back to the medicine default.
        dosage: row.dosage || row.default_dosage,
        frequency: row.frequency || row.default_frequency,
        duration: row.duration || row.default_duration,
        instructions: row.instructions || row.default_instructions || '',
      });
    });

    res.json({
      success: true,
      regimens: regimens.map((regimen) => ({
        id: regimen.id,
        name: regimen.name,
        complaint: regimen.complaint || '',
        diagnosis: regimen.diagnosis || '',
        treatment: regimen.treatment || '',
        medicines: byRegimen.get(regimen.id) || [],
      })),
    });
  } catch (error) {
    console.error('List regimens error:', error);
    res.status(500).json({ success: false, message: 'Could not load the consultation templates.', error: error.message });
  }
}

// PUT /api/regimens/:id  (Staff/Vet/Admin — edit a template without a redeploy)
async function updateRegimen(req, res) {
  const { id } = req.params;

  try {
    const [[existing]] = await db.query('SELECT * FROM condition_regimens WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'That consultation template no longer exists.' });
    }

    const { name, complaint, diagnosis, treatment, active } = req.body;
    const nextName = name !== undefined ? String(name).trim() : existing.name;

    if (!nextName) {
      return res.status(400).json({ success: false, message: 'Template name is required.' });
    }

    // Check for a name clash before the unique key turns it into a raw SQL error.
    const [[dupe]] = await db.query(
      'SELECT id FROM condition_regimens WHERE LOWER(name) = LOWER(?) AND id <> ?',
      [nextName, id]
    );
    if (dupe) {
      return res.status(400).json({ success: false, message: 'Another template already uses that name.' });
    }

    await db.query(
      `UPDATE condition_regimens
       SET name = ?, complaint = ?, diagnosis = ?, treatment = ?, active = ?
       WHERE id = ?`,
      [
        nextName,
        complaint !== undefined ? complaint : existing.complaint,
        diagnosis !== undefined ? diagnosis : existing.diagnosis,
        treatment !== undefined ? treatment : existing.treatment,
        active === undefined ? existing.active : (active ? 1 : 0),
        id,
      ]
    );

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'condition_regimen',
      entity_id: Number(id),
      old_value: existing,
      new_value: req.body,
      description: `Updated consultation template "${existing.name}"`,
    });

    res.json({ success: true, message: 'Consultation template updated.' });
  } catch (error) {
    console.error('Update regimen error:', error);
    res.status(500).json({ success: false, message: 'Could not update the consultation template.', error: error.message });
  }
}

module.exports = { listRegimens, updateRegimen };
