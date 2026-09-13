const db = require("../config/db");
const {
  RegistrationError,
  registerPetForOwner,
} = require("../services/petRegistrationService");

function parseDraftPayload(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

async function getOwnerDraft(userId, draftId) {
  const [rows] = await db.query(
    `SELECT dr.*
     FROM draft_registrations dr
     JOIN pet_owners po ON dr.pet_owner_id = po.id
     WHERE dr.id = ? AND po.user_id = ?`,
    [draftId, userId],
  );

  return rows[0] || null;
}

// POST /api/drafts
async function saveDraft(req, res) {
  const { temp_reg_info, device_id, payload } = req.body;

  try {
    const [ownerRows] = await db.query(
      "SELECT id FROM pet_owners WHERE user_id = ?",
      [req.user.id],
    );

    if (ownerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pet owner profile not found.",
      });
    }

    const draftData = temp_reg_info || payload || {};

    const [result] = await db.query(
      `INSERT INTO draft_registrations (
        pet_owner_id, temp_reg_info, device_id, payload, sync_state
      ) VALUES (?, ?, ?, ?, 'Draft')`,
      [
        ownerRows[0].id,
        JSON.stringify(draftData),
        device_id || null,
        JSON.stringify(payload || draftData),
      ],
    );

    res.status(201).json({
      success: true,
      message: "Draft saved.",
      draftId: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not save draft.",
      error: error.message,
    });
  }
}

// GET /api/drafts
async function getMyDrafts(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT dr.*
       FROM draft_registrations dr
       JOIN pet_owners po ON dr.pet_owner_id = po.id
       WHERE po.user_id = ?
       ORDER BY dr.created_at DESC`,
      [req.user.id],
    );

    res.json({ success: true, drafts: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load drafts.",
      error: error.message,
    });
  }
}

// GET /api/drafts/:id
async function getDraftById(req, res) {
  const { id } = req.params;

  try {
    const draft = await getOwnerDraft(req.user.id, id);

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: "Draft not found.",
      });
    }

    res.json({ success: true, draft });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load draft.",
      error: error.message,
    });
  }
}

// PUT /api/drafts/:id
async function updateDraft(req, res) {
  const { id } = req.params;
  const { temp_reg_info, device_id, payload } = req.body;

  try {
    const draft = await getOwnerDraft(req.user.id, id);

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: "Draft not found.",
      });
    }

    const draftData = temp_reg_info || payload || {};

    await db.query(
      `UPDATE draft_registrations
       SET temp_reg_info = ?, device_id = ?, payload = ?, sync_state = 'Draft', sync_date = NULL
       WHERE id = ?`,
      [
        JSON.stringify(draftData),
        device_id || draft.device_id,
        JSON.stringify(payload || draftData),
        id,
      ],
    );

    res.json({ success: true, message: "Draft updated." });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not update draft.",
      error: error.message,
    });
  }
}

// POST /api/drafts/:id/submit
async function submitDraft(req, res) {
  const { id } = req.params;

  try {
    const draft = await getOwnerDraft(req.user.id, id);

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: "Draft not found.",
      });
    }

    if (draft.sync_state === "Synced") {
      return res.status(400).json({
        success: false,
        message: "This draft has already been submitted.",
      });
    }

    const storedForm = parseDraftPayload(draft.payload || draft.temp_reg_info);
    const photo = req.file ? `/uploads/pets/${req.file.filename}` : storedForm.photo || null;
    const formData = { ...storedForm, ...req.body, photo };
    const result = await registerPetForOwner(req.user.id, formData);

    await db.query(
      `UPDATE draft_registrations
       SET temp_reg_info = ?, payload = ?, sync_state = 'Synced', sync_date = NOW()
       WHERE id = ?`,
      [JSON.stringify(formData), JSON.stringify(formData), id],
    );

    res.status(201).json({
      success: true,
      message: "Draft submitted successfully.",
      ...result,
    });
  } catch (error) {
    if (error instanceof RegistrationError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Could not submit draft.",
      error: error.message,
    });
  }
}

// DELETE /api/drafts/:id
async function deleteDraft(req, res) {
  const { id } = req.params;
  const draftId = Number(id);

  if (!Number.isInteger(draftId) || draftId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid draft ID.",
    });
  }

  try {
    const draft = await getOwnerDraft(req.user.id, draftId);

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: "Draft not found.",
      });
    }

    const [result] = await db.query(
      "DELETE FROM draft_registrations WHERE id = ?",
      [draftId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Draft could not be deleted.",
      });
    }

    res.json({ success: true, message: "Draft deleted." });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not delete draft.",
      error: error.message,
    });
  }
}

module.exports = {
  saveDraft,
  getMyDrafts,
  getDraftById,
  updateDraft,
  submitDraft,
  deleteDraft,
};
