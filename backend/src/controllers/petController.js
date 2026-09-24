const db = require("../config/db");
const path = require("path");
const {
  RegistrationError,
  registerPetForOwner,
} = require("../services/petRegistrationService");
const { createNotification, notifyUsersByRoles } = require("../services/notificationService");
const { generateQrForPet } = require("../utils/qrGenerator");
const { uploadLocalFile, isAbsoluteUrl } = require("../utils/cloudUpload");
const { validatePetRegistration, PET_SEX_VALUES } = require("../utils/validation");
const { logAudit } = require("../middleware/auditMiddleware");

// POST /api/pets  (Pet Owner registers a pet)
async function registerPet(req, res) {
  let photo = req.file ? `/uploads/pets/${req.file.filename}` : null;
  if (req.file) {
    try {
      const localAbs = path.join(__dirname, "../../uploads/pets", req.file.filename);
      const uploaded = await uploadLocalFile(localAbs, "pet-vet/pets");
      if (isAbsoluteUrl(uploaded)) photo = uploaded;
    } catch (_) {}
  }

  try {
    const result = await registerPetForOwner(req.user.id, {
      ...req.body,
      photo,
    });

    res.status(201).json({
      success: true,
      message: "Pet registered successfully.",
      ...result,
    });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'pet',
      entity_id: result?.petId,
      new_value: { pet_code: result?.petCode, name: req.body?.name },
      description: `Pet "${req.body?.name}" registered (${result?.petCode || 'no code'})`
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
      message: "Pet registration failed.",
      error: error.message,
    });
  }
}

// PUT /api/pets/:id/report-lost
async function reportLost(req, res) {
  const { id } = req.params;
  const { last_seen, reward } = req.body;

  try {
    const [[pet]] = await db.query(
      `SELECT p.id, p.name, p.is_lost, po.user_id
       FROM pets p
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE p.id = ?`,
      [id]
    );

    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found." });
    }

    if (req.user.role === "Owner" && pet.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only report your own pets as lost." });
    }

    const oldValue = { is_lost: pet.is_lost };
    await db.query(
      `UPDATE pets SET is_lost = 1, lost_date = NOW(), last_seen = ?, reward = ? WHERE id = ?`,
      [last_seen || null, reward || null, id]
    );

    await createNotification(
      pet.user_id,
      "Lost Pet Alert",
      `${pet.name} has been reported missing.`,
      "LostPet",
      false,
      "my-pets"
    );

    await notifyUsersByRoles(
      ["Staff", "Veterinarian", "Admin"],
      "Lost Pet Reported",
      `${pet.name} has been reported missing.`,
      "LostPet"
    );

    res.json({ success: true, message: "Pet has been reported as lost." });

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'pet',
      entity_id: id,
      old_value,
      new_value: { is_lost: 1, last_seen: last_seen || null, reward: reward || null },
      description: `Pet "${pet.name}" reported lost${reward ? ` with reward ₱${reward}` : ''}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to report lost pet.", error: error.message });
  }
}

// PUT /api/pets/:id/found
async function markFound(req, res) {
  const { id } = req.params;

  try {
    const [[pet]] = await db.query(
      `SELECT p.id, p.name, p.is_lost, po.user_id
       FROM pets p
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE p.id = ?`,
      [id]
    );

    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found." });
    }

    if (req.user.role === "Owner" && pet.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only update your own pets." });
    }

    const oldValue = { is_lost: pet.is_lost };
    await db.query(
      `UPDATE pets SET is_lost = 0, lost_date = NULL, last_seen = NULL, reward = NULL WHERE id = ?`,
      [id]
    );

    res.json({ success: true, message: "Pet has been marked as found." });

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'pet',
      entity_id: id,
      old_value: oldValue,
      new_value: { is_lost: 0 },
      description: `Pet "${pet.name}" marked as found`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to update pet.", error: error.message });
  }
}

// PUT /api/pets/:id/health  (Owner/Staff/Admin/Vet - health & emergency flags)
async function updatePetHealth(req, res) {
  const { id } = req.params;
  const {
    allergies,
    current_medication,
    important_conditions,
    special_instructions,
  } = req.body;

  try {
    const [[pet]] = await db.query(
      `SELECT p.id, p.name, po.user_id
       FROM pets p
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE p.id = ?`,
      [id]
    );

    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found." });
    }

    if (req.user.role === "Owner" && pet.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only update your own pets." });
    }

    await db.query(
      `UPDATE pets SET
        allergies = ?,
        current_medication = ?,
        important_conditions = ?,
        special_instructions = ?
       WHERE id = ?`,
      [
        allergies || null,
        current_medication || null,
        important_conditions || null,
        special_instructions || null,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Health and emergency information updated.",
      petId: id,
    });

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'pet',
      entity_id: id,
      old_value: { allergies: pet.allergies, current_medication: pet.current_medication, important_conditions: pet.important_conditions, special_instructions: pet.special_instructions },
      new_value: {
        allergies: allergies || null,
        current_medication: current_medication || null,
        important_conditions: important_conditions || null,
        special_instructions: special_instructions || null,
      },
      description: `Health & emergency information updated for "${pet.name}"`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not update health information.",
      error: error.message,
    });
  }
}

// PUT /api/pets/:id/owner-info  (Staff/Admin/Vet - owner contact + emergency)
async function updatePetOwnerInfo(req, res) {
  const { id } = req.params;
  const {
    full_name,
    contact_number,
    address,
    barangay,
    emergency_contact_name,
    emergency_contact_number,
  } = req.body;

  try {
    const [[pet]] = await db.query(
      `SELECT p.id, p.name, po.id AS owner_row_id, po.full_name, po.contact_number,
              po.address, po.barangay, po.emergency_contact_name, po.emergency_contact_number
       FROM pets p
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE p.id = ?`,
      [id]
    );

    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found." });
    }

    await db.query(
      `UPDATE pet_owners SET
        full_name = ?,
        contact_number = ?,
        address = ?,
        barangay = ?,
        emergency_contact_name = ?,
        emergency_contact_number = ?
       WHERE id = ?`,
      [
        full_name || pet.full_name,
        contact_number || null,
        address || null,
        barangay || null,
        emergency_contact_name || null,
        emergency_contact_number || null,
        pet.owner_row_id,
      ]
    );

    res.json({
      success: true,
      message: "Owner information updated.",
      petId: id,
    });

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'pet_owner',
      entity_id: pet.owner_row_id,
      old_value: {
        full_name: pet.full_name,
        contact_number: pet.contact_number,
        address: pet.address,
        barangay: pet.barangay,
        emergency_contact_name: pet.emergency_contact_name,
        emergency_contact_number: pet.emergency_contact_number,
      },
      new_value: {
        full_name: full_name || pet.full_name,
        contact_number: contact_number || null,
        address: address || null,
        barangay: barangay || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_number: emergency_contact_number || null,
      },
      description: `Owner information updated for pet "${pet.name}"`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not update owner information.",
      error: error.message,
    });
  }
}

// GET /api/pets/my-pets  (Pet Owner's own pets)
async function getMyPets(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT p.*, s.species_name, COALESCE(b.breed_name, p.breed_custom) AS breed_name,
              qc.status AS qr_status,
              (SELECT COUNT(*) FROM vaccination_records vr WHERE vr.pet_id = p.id) AS vaccination_count,
              (SELECT COUNT(*) FROM vaccination_records vr
                 WHERE vr.pet_id = p.id
                   AND vr.next_due_date IS NOT NULL
                   AND vr.next_due_date < CURDATE()
              ) AS overdue_vaccinations,
              (SELECT COUNT(*) FROM vaccination_records vr
                 WHERE vr.pet_id = p.id
                   AND vr.next_due_date IS NOT NULL
                   AND vr.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
              ) AS due_soon_vaccinations,
              (SELECT payment_status FROM payments py WHERE py.pet_id = p.id ORDER BY py.created_at DESC LIMIT 1) AS latest_payment_status,
              (SELECT validation_status FROM payments py WHERE py.pet_id = p.id ORDER BY py.created_at DESC LIMIT 1) AS latest_payment_validation
       FROM pets p
       JOIN pet_owners po ON p.pet_owner_id = po.id
       LEFT JOIN species s ON p.species_id = s.id
       LEFT JOIN breeds b ON p.breed_id = b.id
       LEFT JOIN qr_codes qc ON qc.pet_id = p.id
       WHERE po.user_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.id],
    );
    res.json({ success: true, pets: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load pets.",
      error: error.message,
    });
  }
}

// GET /api/pets/:id  (Owner - own pet only; Staff/Admin/Vet - any pet)
async function getPetById(req, res) {
  const { id } = req.params;
  try {
    // LEFT JOIN pet_owners so a pet whose owner profile is missing (e.g. a
    // just-registered account not fully set up yet) still resolves instead of
    // 404ing and making the "View" button appear broken.
    const [rows] = await db.query(
      `SELECT p.*, s.species_name, COALESCE(b.breed_name, p.breed_custom) AS breed_name,
              qc.status AS qr_status, po.barangay, po.user_id AS owner_user_id,
              po.full_name AS owner_name,
              (SELECT COUNT(*) FROM vaccination_records vr WHERE vr.pet_id = p.id) AS vaccination_count,
              (SELECT COUNT(*) FROM vaccination_records vr
                 WHERE vr.pet_id = p.id
                   AND vr.next_due_date IS NOT NULL
                   AND vr.next_due_date < CURDATE()
              ) AS overdue_vaccinations,
              (SELECT COUNT(*) FROM vaccination_records vr
                 WHERE vr.pet_id = p.id
                   AND vr.next_due_date IS NOT NULL
                   AND vr.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
              ) AS due_soon_vaccinations,
              (SELECT payment_status FROM payments py WHERE py.pet_id = p.id ORDER BY py.created_at DESC LIMIT 1) AS latest_payment_status,
              (SELECT validation_status FROM payments py WHERE py.pet_id = p.id ORDER BY py.created_at DESC LIMIT 1) AS latest_payment_validation
       FROM pets p
       LEFT JOIN pet_owners po ON p.pet_owner_id = po.id
       LEFT JOIN species s ON p.species_id = s.id
       LEFT JOIN breeds b ON p.breed_id = b.id
       LEFT JOIN qr_codes qc ON qc.pet_id = p.id
       WHERE p.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Pet not found." });
    }

    const pet = rows[0];

    if (req.user.role === "Owner" && pet.owner_user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own pets.",
      });
    }

    res.json({ success: true, pet });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load pet.",
      error: error.message,
    });
  }
}

// PUT /api/pets/:id  (Owner updates their own pet's basic info)
async function updatePet(req, res) {
  const { id } = req.params;
  const {
    species_id,
    breed_id,
    breed_other,
    name,
    sex,
    color,
    birthdate,
  } = req.body;

  const validation = validatePetRegistration({
    name,
    species_id,
    breed_id,
    breed_other,
    sex,
    birthdate,
  });

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
      errors: validation.errors,
    });
  }

  if (sex && !PET_SEX_VALUES.includes(sex)) {
    return res.status(400).json({
      success: false,
      message: "Select a valid sex.",
    });
  }

  try {
    const [[pet]] = await db.query(
      `SELECT p.*, po.user_id
       FROM pets p
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE p.id = ?`,
      [id],
    );

    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found." });
    }

    if (req.user.role === "Owner" && pet.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own pets.",
      });
    }

    const breedId = breed_id && breed_id !== "other" ? breed_id : null;
    const breedCustom = breed_id === "other" ? breed_other || null : null;

    const [duplicatePet] = await db.query(
      `SELECT id
       FROM pets
       WHERE pet_owner_id = ?
         AND LOWER(name) = LOWER(?)
         AND species_id = ?
         AND birthdate <=> ?
         AND id != ?`,
      [pet.pet_owner_id, name.trim(), species_id, birthdate || null, id],
    );

    if (duplicatePet.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Another pet with the same name, species, and birthdate is already registered.",
      });
    }

    let photo = null;
    if (req.file) {
      photo = `/uploads/pets/${req.file.filename}`;
      try {
        const localAbs = path.join(__dirname, "../../uploads/pets", req.file.filename);
        const uploaded = await uploadLocalFile(localAbs, "pet-vet/pets");
        if (isAbsoluteUrl(uploaded)) photo = uploaded;
      } catch (_) {}
    }

    await db.query(
      `UPDATE pets SET
        name = ?,
        species_id = ?,
        breed_id = ?,
        breed_custom = ?,
        sex = ?,
        color = ?,
        birthdate = ?,
        photo = COALESCE(?, photo)
       WHERE id = ?`,
      [
        name.trim(),
        species_id,
        breedId,
        breedCustom,
        sex,
        color || null,
        birthdate || null,
        photo,
        id,
      ],
    );

    res.json({
      success: true,
      message: "Pet information updated.",
      petId: id,
    });

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'pet',
      entity_id: id,
      old_value: {
        name: pet.name,
        species_id: pet.species_id,
        breed_id: pet.breed_id,
        breed_custom: pet.breed_custom,
        sex: pet.sex,
        color: pet.color,
        birthdate: pet.birthdate,
      },
      new_value: {
        name: name.trim(),
        species_id,
        breed_id: breedId,
        breed_custom: breedCustom,
        sex,
        color: color || null,
        birthdate: birthdate || null,
      },
      description: `Pet "${name.trim()}" information updated`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not update pet.",
      error: error.message,
    });
  }
}

// GET /api/pets/search  (Staff/Admin/Vet - lightweight, server-side pet search for pickers)
// Never loads the full pet table — returns only the top matches so it scales to
// hundreds of thousands of registrations.
async function searchPets(req, res) {
  const { q, barangay, status } = req.query;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const term = String(q || '').trim().toLowerCase();

  // Without a query term or barangay filter there is nothing bounded to return.
  if (!term && !barangay) {
    return res.json({ success: true, pets: [] });
  }

  const escapeLike = (value) => String(value).replace(/[\\%_]/g, (ch) => `\\${ch}`);

  try {
    let query = `
      SELECT p.id, p.name, p.pet_code, p.status, p.pet_owner_id,
             p.species_id, p.breed_custom, p.photo, p.sex, p.color, p.birthdate,
             p.registration_date,
             s.species_name,
             COALESCE(b.breed_name, p.breed_custom) AS breed_name,
             po.full_name AS owner_name, po.barangay, po.address, po.contact_number
      FROM pets p
      JOIN pet_owners po ON p.pet_owner_id = po.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (term) {
      const like = `%${escapeLike(term)}%`;
      query += `
        AND (LOWER(p.name) LIKE ? OR LOWER(p.pet_code) LIKE ? OR LOWER(po.full_name) LIKE ?)
      `;
      params.push(like, like, like);
    }

    if (barangay) {
      if (barangay === '__none__') {
        query += " AND (po.barangay IS NULL OR po.barangay = '')";
      } else {
        query += " AND po.barangay = ?";
        params.push(barangay);
      }
    }

    if (status) {
      query += " AND p.status = ?";
      params.push(status);
    }

    // Rank exact/prefix matches first so the most relevant pet is at the top.
    if (term) {
      query += `
        ORDER BY
          CASE WHEN LOWER(p.name) = ? THEN 0 ELSE 1 END,
          CASE WHEN LOWER(p.name) LIKE ? THEN 0 ELSE 1 END,
          CASE WHEN LOWER(p.pet_code) LIKE ? THEN 0 ELSE 1 END,
          p.created_at DESC
      `;
      params.push(term, `${escapeLike(term)}%`, `${escapeLike(term)}%`);
    } else {
      query += " ORDER BY p.created_at DESC";
    }

    query += " LIMIT ?";
    params.push(limit);

    const [rows] = await db.query(query, params);
    res.json({ success: true, pets: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not search pets.",
      error: error.message,
    });
  }
}

// GET /api/pets/by-owner/:ownerId  (Staff/Admin/Vet - lightweight pets of one owner)
async function getPetsByOwner(req, res) {
  const { ownerId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.name, p.pet_code, p.status, p.pet_owner_id,
              s.species_name, COALESCE(b.breed_name, p.breed_custom) AS breed_name,
              po.full_name AS owner_name
       FROM pets p
       JOIN pet_owners po ON p.pet_owner_id = po.id
       LEFT JOIN species s ON p.species_id = s.id
       LEFT JOIN breeds b ON p.breed_id = b.id
       WHERE p.pet_owner_id = ?
       ORDER BY p.name ASC`,
      [ownerId],
    );
    res.json({ success: true, pets: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load the owner's pets.",
      error: error.message,
    });
  }
}

// GET /api/pets  (Staff/Admin - all pets, with search/filter)
async function getAllPets(req, res) {
  const { search, status, barangay } = req.query;
  try {
    let query = `
      SELECT p.*, s.species_name, COALESCE(b.breed_name, p.breed_custom) AS breed_name, po.full_name AS owner_name, po.barangay
      FROM pets p
      JOIN pet_owners po ON p.pet_owner_id = po.id
      LEFT JOIN species s ON p.species_id = s.id
      LEFT JOIN breeds b ON p.breed_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query +=
        " AND (p.name LIKE ? OR po.full_name LIKE ? OR b.breed_name LIKE ? OR p.breed_custom LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      query += " AND p.status = ?";
      params.push(status);
    }
    if (barangay) {
      if (barangay === '__none__') {
        query += " AND (po.barangay IS NULL OR po.barangay = '')";
      } else {
        query += " AND po.barangay = ?";
        params.push(barangay);
      }
    }
    query += " ORDER BY p.created_at DESC";

    const [rows] = await db.query(query, params);
    res.json({ success: true, pets: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load pets.",
      error: error.message,
    });
  }
}

// GET /api/pets/species-breeds  (dropdown data for the registration form)
async function getSpeciesAndBreeds(req, res) {
  try {
    const [species] = await db.query("SELECT * FROM species");
    const [breeds] = await db.query("SELECT * FROM breeds");
    res.json({ success: true, species, breeds });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load reference data.",
      error: error.message,
    });
  }
}

// PUT /api/pets/:id/verify
async function verifyPet(req, res) {
  const { id } = req.params;

  try {
    const [[pet]] = await db.query(
      `SELECT p.id, p.name, p.pet_code, p.status, po.user_id
       FROM pets p
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE p.id = ?`,
      [id]
    );

    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found." });
    }

    if (pet.status === "Verified") {
      return res.json({
        success: true,
        message: "Pet registration is already verified.",
      });
    }

    await db.query(`UPDATE pets SET status = 'Verified' WHERE id = ?`, [id]);

    const [[existingQr]] = await db.query(
      `SELECT id FROM qr_codes WHERE pet_id = ? LIMIT 1`,
      [id]
    );

    if (!existingQr) {
      const { qrToken, imagePath } = await generateQrForPet(id, pet.pet_code);
      await db.query(
        `INSERT INTO qr_codes (pet_id, qr_token, image_path, status) VALUES (?, ?, ?, 'Generated')`,
        [id, qrToken, imagePath]
      );

      try {
        await createNotification(
          pet.user_id,
          "QR Generated",
          `QR Code has been generated for ${pet.name}.`,
          "QR",
          false,
          "qr-records"
        );
      } catch (_) {
        // notification failure should not block verification
      }
    }

    try {
      await createNotification(
        pet.user_id,
        "Registration Verified",
        `${pet.name}'s registration has been verified.`,
        "Registration",
        false,
        "my-pets"
      );
    } catch (_) {
      // notification failure should not block verification
    }

    res.json({
      success: true,
      message: "Pet registration verified successfully.",
    });

    await logAudit(req, {
      action: 'VERIFY',
      entity_type: 'pet',
      entity_id: pet.id,
      old_value: { status: pet.status },
      new_value: { status: 'Verified' },
      description: `Pet "${pet.name}" registration verified`
    });
  } catch (error) {
    console.error("Verify pet error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to verify pet registration.",
      error: error.message,
    });
  }
}

// DELETE /api/pets/:id  (Staff/Admin deletes a pet registration)
async function deletePet(req, res) {
  const { id } = req.params;

  try {
    // Check pet exists — use LEFT JOIN so id=0 in pet_owners doesn't block lookup
    const [[pet]] = await db.query(
      `SELECT p.name, po.user_id FROM pets p
       LEFT JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE p.id = ?`,
      [id]
    );

    if (!pet) {
      return res.status(404).json({ success: false, message: 'Pet not found.' });
    }

    // Owners may only delete their own pet registration
    if (req.user.role === 'Owner' && Number(pet.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own pet.' });
    }

    // Disable FK checks, delete everything, re-enable
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('DELETE FROM prescriptions WHERE consultation_id IN (SELECT id FROM consultation_records WHERE pet_id = ?)', [id]);
    await db.query('DELETE FROM consultation_records WHERE pet_id = ?', [id]);
    await db.query('DELETE FROM vaccination_records WHERE pet_id = ?', [id]);
    await db.query('DELETE FROM payments WHERE pet_id = ?', [id]);
    await db.query('DELETE FROM qr_codes WHERE pet_id = ?', [id]);
    await db.query('DELETE FROM record_requests WHERE pet_id = ?', [id]);
    await db.query('DELETE FROM pets WHERE id = ?', [id]);
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    // Notify the owner
    try {
      const isOwner = req.user.role === 'Owner';
      await createNotification(
        pet.user_id,
        'Registration Removed',
        isOwner
          ? `You removed ${pet.name}'s registration.`
          : `${pet.name}'s registration has been removed by clinic staff.`,
        'Registration',
        false,
        'my-pets'
      );
    } catch (_) {
      // notification failure should not block the delete response
    }

    res.json({ success: true, message: `${pet.name}'s registration has been deleted.` });

    await logAudit(req, {
      action: 'DELETE',
      entity_type: 'pet',
      entity_id: id,
      old_value: { name: pet.name },
      description: `Deleted pet registration "${pet.name}"`
    });
  } catch (error) {
    await db.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    console.error('Delete pet error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete pet registration.', error: error.message });
  }
}

module.exports = {
  registerPet,
  getMyPets,
  getPetById,
  updatePet,
  updatePetHealth,
  updatePetOwnerInfo,
  getAllPets,
  searchPets,
  getPetsByOwner,
  getSpeciesAndBreeds,
  reportLost,
  markFound,
  verifyPet,
  deletePet,
};
