const db = require("../config/db");
const { generateOutreachQr, generateQrToken } = require("../utils/outreachQrGenerator");
const { logAudit } = require("../middleware/auditMiddleware");

const PROGRAM_STATUSES = ["Setup", "Ongoing", "Completed", "Cancelled"];

// =========================================
// SMALL HELPERS
// =========================================

function parseDecimal(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? Number(n.toFixed(2)) : null;
}

// Applies a status filter clause (plus params) to a transactions query.
function statusClause(req) {
  const status = (req.query.status || "").trim();
  if (["Pending", "Submitted", "Verified", "Rejected"].includes(status)) {
    return { sql: "ot.status = ?", params: [status] };
  }
  return { sql: "1=1", params: [] };
}

// =========================================
// PROGRAMS
// =========================================

async function getPrograms(req, res) {
  try {
    const [programs] = await db.query(`
      SELECT
        op.*,
        COUNT(ot.id) AS total_transactions,
        SUM(ot.status = 'Verified') AS verified_transactions,
        COALESCE(SUM(CASE WHEN ot.status='Verified' THEN ot.total_amount ELSE 0 END), 0) AS verified_amount
      FROM outreach_programs op
      LEFT JOIN outreach_transactions ot ON ot.outreach_id = op.id
      GROUP BY op.id
      ORDER BY op.event_date DESC, op.id DESC
    `);

    for (const program of programs) {
      const [services] = await db.query(
        "SELECT id, service_name, amount FROM outreach_program_services WHERE outreach_id = ? ORDER BY id ASC",
        [program.id]
      );
      program.services = services;
    }

    res.json({ success: true, programs });
  } catch (error) {
    console.error("Get outreach programs error:", error);
    res.status(500).json({ success: false, message: "Could not load outreach programs.", error: error.message });
  }
}

async function createProgram(req, res) {
  const { program_name, event_date, end_date, barangay, venue, notes, status, services } = req.body;

  if (!program_name || !String(program_name).trim()) {
    return res.status(400).json({ success: false, message: "Program name is required." });
  }

  const programStatus = status && PROGRAM_STATUSES.includes(status) ? status : "Setup";
  const serviceRows = Array.isArray(services) ? services.filter((s) => s && String(s.service_name || "").trim()) : [];
  if (serviceRows.length === 0) {
    return res.status(400).json({ success: false, message: "Add at least one service (with price) for the program." });
  }
  for (const svc of serviceRows) {
    if (parseDecimal(svc.amount) === null) {
      return res.status(400).json({ success: false, message: "Each service needs a valid amount (0 allowed for free)." });
    }
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO outreach_programs (program_name, event_date, end_date, barangay, venue, notes, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(program_name).trim(),
        event_date || null,
        end_date || null,
        barangay || null,
        venue || null,
        notes || null,
        programStatus,
        req.user.id || null,
      ]
    );
    const outreachId = result.insertId;

    for (const svc of serviceRows) {
      await connection.query(
        "INSERT INTO outreach_program_services (outreach_id, service_name, amount) VALUES (?, ?, ?)",
        [outreachId, String(svc.service_name).trim(), parseDecimal(svc.amount)]
      );
    }

    await connection.commit();
    res.json({ success: true, message: "Outreach program created.", id: outreachId });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'outreach_program',
      entity_id: outreachId,
      new_value: { program_name: String(program_name).trim(), status: programStatus, barangay: barangay || null },
      description: `Created outreach program "${String(program_name).trim()}" (status: ${programStatus})`
    });
  } catch (error) {
    await connection.rollback();
    console.error("Create outreach program error:", error);
    res.status(500).json({ success: false, message: "Could not create outreach program.", error: error.message });
  } finally {
    connection.release();
  }
}

async function getProgram(req, res) {
  try {
    const [[program]] = await db.query("SELECT * FROM outreach_programs WHERE id = ?", [req.params.id]);
    if (!program) {
      return res.status(404).json({ success: false, message: "Outreach program not found." });
    }
    const [services] = await db.query(
      "SELECT id, service_name, amount FROM outreach_program_services WHERE outreach_id = ? ORDER BY id ASC",
      [program.id]
    );
    program.services = services;
    res.json({ success: true, program });
  } catch (error) {
    console.error("Get outreach program error:", error);
    res.status(500).json({ success: false, message: "Could not load outreach program.", error: error.message });
  }
}

async function updateProgram(req, res) {
  const { id } = req.params;
  const { program_name, event_date, end_date, barangay, venue, notes, status, services } = req.body;

  const [[existing]] = await db.query("SELECT id, program_name, status FROM outreach_programs WHERE id = ?", [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Outreach program not found." });
  }

  if (status && !PROGRAM_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid program status." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE outreach_programs SET
         program_name = COALESCE(?, program_name),
         event_date = COALESCE(?, event_date),
         end_date = COALESCE(?, end_date),
         barangay = COALESCE(?, barangay),
         venue = COALESCE(?, venue),
         notes = COALESCE(?, notes),
         status = ?
       WHERE id = ?`,
      [
        program_name ? String(program_name).trim() : null,
        event_date || null,
        end_date || null,
        barangay || null,
        venue || null,
        notes || null,
        status || "Setup",
        id,
      ]
    );

    if (Array.isArray(services) && services.length > 0) {
      const valid = services.filter((s) => s && String(s.service_name || "").trim() && parseDecimal(s.amount) !== null);
      if (valid.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "Each service needs a name and a valid amount." });
      }
      await connection.query("DELETE FROM outreach_program_services WHERE outreach_id = ?", [id]);
      for (const svc of valid) {
        await connection.query(
          "INSERT INTO outreach_program_services (outreach_id, service_name, amount) VALUES (?, ?, ?)",
          [id, String(svc.service_name).trim(), parseDecimal(svc.amount)]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: "Outreach program updated." });

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'outreach_program',
      entity_id: id,
      old_value: { program_name: existing.program_name, status: existing.status },
      new_value: {
        program_name: program_name ? String(program_name).trim() : existing.program_name,
        status: status || existing.status,
      },
      description: `Updated outreach program "${existing.program_name}"`
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update outreach program error:", error);
    res.status(500).json({ success: false, message: "Could not update outreach program.", error: error.message });
  } finally {
    connection.release();
  }
}

async function deleteProgram(req, res) {
  const { id } = req.params;
  try {
    const [[existing]] = await db.query("SELECT id, program_name FROM outreach_programs WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Outreach program not found." });
    }
    const [[{ c }]] = await db.query(
      "SELECT COUNT(*) AS c FROM outreach_transactions WHERE outreach_id = ?",
      [id]
    );
    if (Number(c) > 0) {
      return res.status(400).json({
        success: false,
        message: "This program already has transactions. Mark it as Cancelled or Completed instead of deleting it.",
      });
    }
    await db.query("DELETE FROM outreach_programs WHERE id = ?", [id]);
    res.json({ success: true, message: "Outreach program deleted." });

    await logAudit(req, {
      action: 'DELETE',
      entity_type: 'outreach_program',
      entity_id: id,
      old_value: { program_name: existing.program_name },
      description: `Deleted outreach program "${existing.program_name}"`
    });
  } catch (error) {
    console.error("Delete outreach program error:", error);
    res.status(500).json({ success: false, message: "Could not delete outreach program.", error: error.message });
  }
}

// =========================================
// SUMMARY
// =========================================

async function buildProgramSummary(outreachId) {
  const where = outreachId ? "WHERE ot.outreach_id = ?" : "";
  const params = outreachId ? [outreachId] : [];

  const [rows] = await db.query(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(ot.status='Pending'),0) AS pending,
       COALESCE(SUM(ot.status='Submitted'),0) AS submitted,
       COALESCE(SUM(ot.status='Verified'),0) AS verified,
       COALESCE(SUM(ot.status='Rejected'),0) AS rejected,
       COALESCE(SUM(ot.total_amount),0) AS totalAmount,
       COALESCE(SUM(CASE WHEN ot.status='Verified' THEN ot.total_amount ELSE 0 END),0) AS verifiedAmount,
       COUNT(DISTINCT ot.pet_owner_id) AS linkedOwners,
       COUNT(DISTINCT ot.pet_id) AS linkedPets,
       COUNT(DISTINCT ot.owner_name) AS namedOwners
     FROM outreach_transactions ot ${where}`,
    params
  );

  const [byBarangay] = await db.query(
    `SELECT
       ot.barangay,
       COUNT(*) AS total,
       COALESCE(SUM(ot.status='Verified'),0) AS verified,
       COALESCE(SUM(ot.total_amount),0) AS amount
     FROM outreach_transactions ot ${where}
     GROUP BY ot.barangay
     ORDER BY amount DESC`,
    params
  );

  const r = rows[0] || {};
  return {
    totals: {
      total: Number(r.total || 0),
      pending: Number(r.pending || 0),
      submitted: Number(r.submitted || 0),
      verified: Number(r.verified || 0),
      rejected: Number(r.rejected || 0),
      totalAmount: Number(r.totalAmount || 0),
      verifiedAmount: Number(r.verifiedAmount || 0),
      petOwners: Number(r.linkedOwners || 0) + Number(r.namedOwners || 0),
      pets: Number(r.linkedPets || 0),
    },
    byBarangay: byBarangay.map((b) => ({
      barangay: b.barangay || "N/A",
      total: Number(b.total || 0),
      verified: Number(b.verified || 0),
      amount: Number(b.amount || 0),
    })),
  };
}

async function getSummary(req, res) {
  try {
    if (req.params.id) {
      const [[program]] = await db.query("SELECT id FROM outreach_programs WHERE id = ?", [req.params.id]);
      if (!program) {
        return res.status(404).json({ success: false, message: "Outreach program not found." });
      }
      const summary = await buildProgramSummary(Number(req.params.id));
      const [programs] = await db.query("SELECT * FROM outreach_programs WHERE id = ?", [req.params.id]);
      return res.json({ success: true, summary, program: programs[0] });
    }

    const summary = await buildProgramSummary(null);
    res.json({ success: true, summary });
  } catch (error) {
    console.error("Get outreach summary error:", error);
    res.status(500).json({ success: false, message: "Could not load outreach summary.", error: error.message });
  }
}

// =========================================
// PROGRAM QR (single QR per program/event)
// =========================================

async function generateProgramQr(req, res) {
  const { id } = req.params;
  try {
    const [[program]] = await db.query(
      "SELECT id, program_name, qr_token, qr_image_path FROM outreach_programs WHERE id = ?",
      [id]
    );
    if (!program) {
      return res.status(404).json({ success: false, message: "Outreach program not found." });
    }

    const qrToken = generateQrToken();
    const { imagePath } = await generateOutreachQr(qrToken);

    await db.query("UPDATE outreach_programs SET qr_token = ?, qr_image_path = ? WHERE id = ?", [
      qrToken,
      imagePath,
      id,
    ]);

    res.json({
      success: true,
      message: "Program QR generated. All pet owners scan this same QR to confirm their details.",
      qrToken,
      qrImagePath: imagePath,
    });

    await logAudit(req, {
      action: 'UPDATE',
      entity_type: 'outreach_program',
      entity_id: id,
      new_value: { qr_regenerated: true },
      description: `Regenerated QR for outreach program "${program.program_name}"`
    });
  } catch (error) {
    console.error("Generate program QR error:", error);
    res.status(500).json({ success: false, message: "Could not generate the program QR.", error: error.message });
  }
}

async function listTransactions(req, res) {
  const { id } = req.params;
  const { q } = req.query;
  const filter = statusClause(req);

  const term = (q || "").trim();

  try {
    const params = [id, ...filter.params];
    const whereStatus = filter.sql;
    const whereSearch = term ? "AND (ot.owner_name LIKE ? OR ot.pet_name LIKE ? OR ot.barangay LIKE ?)" : "";
    if (term) {
      params.push(`%${term}%`, `%${term}%`, `%${term}%`);
    }

    const [rows] = await db.query(
      `SELECT
         ot.*,
         CONCAT(op.program_name) AS program_name
       FROM outreach_transactions ot
       LEFT JOIN outreach_programs op ON op.id = ot.outreach_id
       WHERE ot.outreach_id = ? AND ${whereStatus} ${whereSearch}
       ORDER BY ot.id DESC
       LIMIT 500`,
      params
    );

    const [items] = await db.query(
      `SELECT transaction_id, id, service_name, amount
       FROM outreach_transaction_items
       WHERE transaction_id IN (?)
       ORDER BY id ASC`,
      [rows.length ? rows.map((r) => r.id) : [0]]
    );

    const itemMap = {};
    for (const it of items) {
      (itemMap[it.transaction_id] = itemMap[it.transaction_id] || []).push({
        id: it.id,
        service_name: it.service_name,
        amount: Number(it.amount),
      });
    }
    for (const r of rows) {
      r.items = itemMap[r.id] || [];
    }

    res.json({ success: true, transactions: rows });
  } catch (error) {
    console.error("List outreach transactions error:", error);
    res.status(500).json({ success: false, message: "Could not load transactions.", error: error.message });
  }
}

async function verifyTransaction(req, res) {
  const { id } = req.params;
  try {
    const [[tx]] = await db.query("SELECT * FROM outreach_transactions WHERE id = ?", [id]);
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }
    if (tx.status === "Rejected") {
      return res.status(400).json({ success: false, message: "Rejected transactions cannot be verified. Issue a new QR instead." });
    }

    await db.query(
      `UPDATE outreach_transactions
       SET status = 'Verified', verified_at = NOW(), verified_by = ?, rejection_reason = NULL
       WHERE id = ?`,
      [req.user.id || null, id]
    );
    res.json({ success: true, message: "Transaction marked as Verified / Paid." });

    await logAudit(req, {
      action: 'VERIFY',
      entity_type: 'transaction',
      entity_id: tx.id,
      old_value: { status: tx.status, total_amount: tx.total_amount },
      new_value: { status: 'Verified' },
      description: `Verified outreach transaction "${tx.owner_name || tx.pet_name || tx.id}" — ₱${tx.total_amount}`
    });
  } catch (error) {
    console.error("Verify outreach transaction error:", error);
    res.status(500).json({ success: false, message: "Could not verify transaction.", error: error.message });
  }
}

async function rejectTransaction(req, res) {
  const { id } = req.params;
  const reason = String(req.body.reason || "").trim();
  try {
    const [[tx]] = await db.query("SELECT * FROM outreach_transactions WHERE id = ?", [id]);
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }
    if (tx.status === "Verified") {
      return res.status(400).json({ success: false, message: "Verified transactions cannot be rejected." });
    }

    await db.query(
      `UPDATE outreach_transactions SET status = 'Rejected', rejection_reason = ? WHERE id = ?`,
      [reason || "Cancelled", id]
    );
    res.json({ success: true, message: "Transaction rejected / cancelled." });

    await logAudit(req, {
      action: 'REJECT',
      entity_type: 'transaction',
      entity_id: tx.id,
      old_value: { status: tx.status, total_amount: tx.total_amount },
      new_value: { status: 'Rejected', rejection_reason: reason || 'Cancelled' },
      description: `Rejected outreach transaction "${tx.owner_name || tx.pet_name || tx.id}"${reason ? ` — ${reason}` : ''}`
    });
  } catch (error) {
    console.error("Reject outreach transaction error:", error);
    res.status(500).json({ success: false, message: "Could not reject transaction.", error: error.message });
  }
}

async function getTransaction(req, res) {
  const { id } = req.params;
  try {
    const [[tx]] = await db.query(
      `SELECT ot.*, op.program_name
       FROM outreach_transactions ot
       LEFT JOIN outreach_programs op ON op.id = ot.outreach_id
       WHERE ot.id = ?`,
      [id]
    );
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    const [items] = await db.query(
      "SELECT id, service_name, amount FROM outreach_transaction_items WHERE transaction_id = ? ORDER BY id ASC",
      [id]
    );
    tx.items = items.map((it) => ({ id: it.id, service_name: it.service_name, amount: Number(it.amount) }));

    res.json({ success: true, transaction: tx });
  } catch (error) {
    console.error("Get outreach transaction error:", error);
    res.status(500).json({ success: false, message: "Could not load transaction.", error: error.message });
  }
}

async function updateTransaction(req, res) {
  const { id } = req.params;
  const { owner_name, owner_contact, pet_name, barangay, service_date, service_time, items } = req.body;

  try {
    const [[tx]] = await db.query("SELECT * FROM outreach_transactions WHERE id = ?", [id]);
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    const name = String(owner_name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Pet owner name is required." });
    }

    const rows = Array.isArray(items)
      ? items
          .map((it) => ({ name: String(it && it.service_name || "").trim(), amount: parseDecimal(it && it.amount) }))
          .filter((it) => it.name && it.amount !== null)
      : [];
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "Add at least one service." });
    }
    const total = Number(rows.reduce((sum, it) => sum + it.amount, 0).toFixed(2));

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE outreach_transactions SET
           owner_name = ?,
           owner_contact = ?,
           pet_name = ?,
           barangay = ?,
           service_date = ?,
           service_time = ?,
           total_amount = ?
         WHERE id = ?`,
        [
          name,
          String(owner_contact || "").trim() || null,
          String(pet_name || "").trim() || null,
          String(barangay || "").trim() || null,
          service_date || null,
          service_time || null,
          total,
          id,
        ]
      );

      await connection.query("DELETE FROM outreach_transaction_items WHERE transaction_id = ?", [id]);
      for (const it of rows) {
        await connection.query(
          "INSERT INTO outreach_transaction_items (transaction_id, service_name, amount) VALUES (?, ?, ?)",
          [id, it.name, it.amount]
        );
      }

      await connection.commit();
      res.json({ success: true, message: "Transaction updated." });

      await logAudit(req, {
        action: 'UPDATE',
        entity_type: 'transaction',
        entity_id: id,
        old_value: {
          owner_name: tx.owner_name,
          pet_name: tx.pet_name,
          total_amount: Number(tx.total_amount),
          status: tx.status,
        },
        new_value: {
          owner_name: name,
          pet_name: String(pet_name || "").trim() || null,
          total_amount: total,
          status: tx.status,
        },
        description: `Updated outreach transaction "${name}" — ₱${total}`
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Update outreach transaction error:", error);
    res.status(500).json({ success: false, message: "Could not update transaction.", error: error.message });
  }
}

async function deleteTransaction(req, res) {
  const { id } = req.params;
  try {
    const [[tx]] = await db.query(
      "SELECT id, owner_name, pet_name, total_amount FROM outreach_transactions WHERE id = ?",
      [id]
    );
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    await db.query("DELETE FROM outreach_transactions WHERE id = ?", [id]);

    res.json({ success: true, message: "Transaction deleted." });

    await logAudit(req, {
      action: 'DELETE',
      entity_type: 'transaction',
      entity_id: id,
      old_value: {
        owner_name: tx.owner_name,
        pet_name: tx.pet_name,
        total_amount: Number(tx.total_amount),
      },
      description: `Deleted outreach transaction "${tx.owner_name || tx.pet_name || tx.id}" — ₱${tx.total_amount}`
    });
  } catch (error) {
    console.error("Delete outreach transaction error:", error);
    res.status(500).json({ success: false, message: "Could not delete transaction.", error: error.message });
  }
}

// =========================================
// PUBLIC — pet code lookup (no auth)
// =========================================

async function lookupPetByCode(req, res) {
  const raw = String(req.query.code || "").trim();
  if (!raw || raw.length < 4) {
    return res.status(400).json({ success: false, message: "Enter at least 4 digits of the pet code." });
  }

  try {
    // Accept partial numeric input: "000381" → matches PET-2026-000381
    // Also accept full format: "PET-2026-000381"
    const isFullFormat = /^PET-\d{4}-\d+$/i.test(raw);
    let rows;

    if (isFullFormat) {
      [rows] = await db.query(
        `SELECT p.id, p.pet_code, p.name AS pet_name,
                po.full_name AS owner_name, po.id AS pet_owner_id,
                s.species_name, p.sex
         FROM pets p
         JOIN pet_owners po ON p.pet_owner_id = po.id
         LEFT JOIN species s ON p.species_id = s.id
         WHERE p.pet_code = ? AND p.status = 'Verified'
         LIMIT 1`,
        [raw.toUpperCase()]
      );
    } else {
      // Numeric-only: pad to 6 digits and match the suffix
      const padded = raw.replace(/\D/g, "").padStart(6, "0");
      [rows] = await db.query(
        `SELECT p.id, p.pet_code, p.name AS pet_name,
                po.full_name AS owner_name, po.id AS pet_owner_id,
                s.species_name, p.sex
         FROM pets p
         JOIN pet_owners po ON p.pet_owner_id = po.id
         LEFT JOIN species s ON p.species_id = s.id
         WHERE p.pet_code LIKE ? AND p.status = 'Verified'
         LIMIT 5`,
        [`%-${padded}`]
      );
    }

    if (!rows || rows.length === 0) {
      return res.json({ success: false, message: "No verified pet found with that code." });
    }

    res.json({
      success: true,
      pets: rows.map((r) => ({
        id: r.id,
        pet_owner_id: r.pet_owner_id,
        pet_code: r.pet_code,
        pet_name: r.pet_name,
        owner_name: r.owner_name,
        species_name: r.species_name || null,
        sex: r.sex || null,
      })),
    });
  } catch (error) {
    console.error("Lookup pet by code error:", error);
    res.status(500).json({ success: false, message: "Could not look up pet code.", error: error.message });
  }
}

// =========================================
// PUBLIC — owner confirmation form
// =========================================

async function getQrFormData(req, res) {
  const token = String(req.params.token || "").trim();

  try {
    // The QR now encodes a single program-level token that every pet owner
    // scans for the same outreach event.
    const [[program]] = await db.query(
      "SELECT * FROM outreach_programs WHERE qr_token = ?",
      [token]
    );
    if (!program) {
      return res.status(404).json({ success: false, message: "This QR code is not recognized or may no longer be active." });
    }

    const [services] = await db.query(
      "SELECT id, service_name, amount FROM outreach_program_services WHERE outreach_id = ? ORDER BY id ASC",
      [program.id]
    );

    res.json({
      success: true,
      formData: {
        token: program.qr_token,
        programId: program.id,
        programName: program.program_name,
        eventDate: program.event_date,
        venue: program.venue,
        programBarangay: program.barangay || "",
        services: services.map((s) => ({ id: s.id, service_name: s.service_name, amount: Number(s.amount) })),
      },
    });
  } catch (error) {
    console.error("Get outreach QR form error:", error);
    res.status(500).json({ success: false, message: "Could not load the confirmation form.", error: error.message });
  }
}

async function submitQrForm(req, res) {
  const token = String(req.params.token || "").trim();
  const { owner_name, pet_name, service_date, service_time, barangay, items, pet_code } = req.body;

  const connection = await db.getConnection();
  try {
    const [[program]] = await connection.query("SELECT * FROM outreach_programs WHERE qr_token = ?", [token]);
    if (!program) {
      return res.status(404).json({ success: false, message: "This QR code is not recognized or may no longer be active." });
    }

    const name = String(owner_name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Pet owner name is required." });
    }

    const rows = Array.isArray(items)
      ? items
          .map((it) => ({ name: String(it && it.service_name || "").trim(), amount: parseDecimal(it && it.amount) }))
          .filter((it) => it.name && it.amount !== null)
      : [];
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "Choose at least one service/vaccination performed." });
    }

    const total = rows.reduce((sum, it) => sum + it.amount, 0);
    const resolvedBarangay = String(barangay || "").trim() || program.barangay;

    // ── Resolve linked pet (optional) ─────────────────────────
    let linkedPetId = null;
    let linkedPetOwnerId = null;
    let linkedPetName = String(pet_name || "").trim() || null;

    const trimmedCode = String(pet_code || "").trim();
    if (trimmedCode) {
      // Accept partial numeric or full PET-YYYY-NNNNNN format
      const isFullFormat = /^PET-\d{4}-\d+$/i.test(trimmedCode);
      let petRows;
      if (isFullFormat) {
        [petRows] = await connection.query(
          "SELECT id, name, pet_owner_id FROM pets WHERE pet_code = ? AND status = 'Verified' LIMIT 1",
          [trimmedCode.toUpperCase()]
        );
      } else {
        const padded = trimmedCode.replace(/\D/g, "").padStart(6, "0");
        [petRows] = await connection.query(
          "SELECT id, name, pet_owner_id FROM pets WHERE pet_code LIKE ? AND status = 'Verified' LIMIT 1",
          [`%-${padded}`]
        );
      }
      if (petRows && petRows.length > 0) {
        linkedPetId = petRows[0].id;
        linkedPetOwnerId = petRows[0].pet_owner_id;
        if (!linkedPetName) linkedPetName = petRows[0].name;
      }
    }

    await connection.beginTransaction();

    // ── Insert outreach transaction ────────────────────────────
    const [result] = await connection.query(
      `INSERT INTO outreach_transactions
         (outreach_id, qr_token, pet_owner_id, pet_id, owner_name, owner_contact, pet_name, barangay, service_date, service_time, total_amount, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'Submitted', NOW())`,
      [
        program.id,
        generateQrToken(),
        linkedPetOwnerId,
        linkedPetId,
        name,
        linkedPetName || null,
        resolvedBarangay,
        service_date || null,
        service_time || null,
        Number(total.toFixed(2)),
      ]
    );

    for (const it of rows) {
      await connection.query(
        "INSERT INTO outreach_transaction_items (transaction_id, service_name, amount) VALUES (?, ?, ?)",
        [result.insertId, it.name, it.amount]
      );
    }

    // ── Create vaccination records for linked pet ──────────────
    if (linkedPetId) {
      for (const it of rows) {
        // Find or create a vaccine entry matching the service name
        let vaccineId = null;
        const [[existingVaccine]] = await connection.query(
          "SELECT id FROM vaccines WHERE LOWER(vaccine_name) = LOWER(?) LIMIT 1",
          [it.name]
        );
        if (existingVaccine) {
          vaccineId = existingVaccine.id;
        } else {
          // Create a new vaccine entry for this outreach service
          const [vaccineResult] = await connection.query(
            "INSERT INTO vaccines (vaccine_name) VALUES (?)",
            [it.name]
          );
          vaccineId = vaccineResult.insertId;
        }

        // Insert the vaccination record; administered_by is NULL (outreach, no specific vet ID)
        await connection.query(
          `INSERT INTO vaccination_records
             (pet_id, vaccine_id, date_administered, next_due_date, status, administered_by, comments)
           VALUES (?, ?, ?, NULL, 'Updated', NULL, ?)`,
          [
            linkedPetId,
            vaccineId,
            service_date || new Date().toISOString().slice(0, 10),
            `Administered via outreach program: ${program.program_name}`,
          ]
        );
      }
    }

    await connection.commit();
    res.json({
      success: true,
      message: "Confirmation submitted. Please pay at the counter.",
      total: Number(total.toFixed(2)),
      linkedPet: linkedPetId ? { pet_id: linkedPetId, pet_name: linkedPetName } : null,
    });

    await logAudit(req, {
      action: 'CREATE',
      entity_type: 'transaction',
      entity_id: result.insertId,
      staff_name: null,
      new_value: { owner_name: name, pet_name: linkedPetName || null, total_amount: Number(total.toFixed(2)), outreach: program.program_name },
      description: `Outreach confirmation submitted for "${name}" — ₱${Number(total.toFixed(2))} (${program.program_name})`
    });
  } catch (error) {
    await connection.rollback();
    console.error("Submit outreach QR form error:", error);
    res.status(500).json({ success: false, message: "Could not submit the confirmation.", error: error.message });
  } finally {
    connection.release();
  }
}

module.exports = {
  getPrograms,
  createProgram,
  getProgram,
  updateProgram,
  deleteProgram,
  getSummary,
  generateProgramQr,
  listTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  verifyTransaction,
  rejectTransaction,
  getQrFormData,
  submitQrForm,
  lookupPetByCode,
};