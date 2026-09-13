const db = require("../config/db");

// =========================================
// OWNER PAYMENT HISTORY
// Combines clinic charges (payment_monitoring)
// with outreach payments (outreach_transactions).
// =========================================

const OUTREACH_SHOWN_STATUSES = ["Submitted", "Verified", "Rejected"];

function parseDate(value) {
  const s = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Fetch clinic records for a pet owner with optional filters.
async function fetchClinicRecords(ownerId, filters = {}) {
  const conditions = ["pm.pet_owner_id = ?"];
  const params = [ownerId];

  const term = (filters.search || "").trim();
  if (term) {
    conditions.push("(pm.or_number LIKE ? OR pm.or_description LIKE ?)");
    params.push(`%${term}%`, `%${term}%`);
  }
  const from = parseDate(filters.from);
  if (from) {
    conditions.push("pm.or_date >= ?");
    params.push(from);
  }
  const to = parseDate(filters.to);
  if (to) {
    conditions.push("pm.or_date <= ?");
    params.push(to);
  }

  const [rows] = await db.query(
    `SELECT
       pm.id,
       pm.or_number,
       pm.or_amount,
       DATE_FORMAT(pm.or_date, '%Y-%m-%d') AS or_date,
       DATE_FORMAT(pm.or_time, '%H:%i:%s') AS or_time,
       pm.or_description,
       pm.payment_items,
       pm.or_photo_path,
       pm.pm_token,
       pm.payment_type,
       pm.medicine_quantity,
       pm.medicine_total,
       pm.remarks,
       pm.recorded_by,
       ru.full_name AS recorded_by_name,
       m.medicine_name
     FROM payment_monitoring pm
     LEFT JOIN users ru ON pm.recorded_by = ru.id
     LEFT JOIN medicines m ON pm.medicine_id = m.id
     WHERE ${conditions.join(" AND ")}
     ORDER BY pm.or_date DESC, pm.or_time DESC, pm.id DESC`,
    params
  );
  return rows;
}

// Fetch outreach payments matched to an owner by their full name
// (the public QR flow stores owner_name as text only).
async function fetchOutreachRecords(ownerName, filters = {}) {
  const conditions = ["LOWER(TRIM(ot.owner_name)) = LOWER(TRIM(?))"];
  const params = [ownerName];

  conditions.push(`ot.status IN (${OUTREACH_SHOWN_STATUSES.map(() => "?").join(", ")})`);
  params.push(...OUTREACH_SHOWN_STATUSES);

  const term = (filters.search || "").trim();
  if (term) {
    conditions.push("(op.program_name LIKE ? OR ot.pet_name LIKE ? OR ot.owner_name LIKE ?)");
    params.push(`%${term}%`, `%${term}%`, `%${term}%`);
  }
  const from = parseDate(filters.from);
  if (from) {
    conditions.push("ot.service_date >= ?");
    params.push(from);
  }
  const to = parseDate(filters.to);
  if (to) {
    conditions.push("ot.service_date <= ?");
    params.push(to);
  }

  let [rows] = await db.query(
    `SELECT
       ot.id,
       ot.outreach_id,
       ot.qr_token,
       ot.pet_name,
       ot.barangay,
       ot.total_amount,
       ot.status,
       ot.rejection_reason,
       DATE_FORMAT(ot.service_date, '%Y-%m-%d') AS service_date,
       DATE_FORMAT(ot.service_time, '%H:%i:%s') AS service_time,
       DATE_FORMAT(ot.submitted_at, '%Y-%m-%d %H:%i:%s') AS submitted_at,
       DATE_FORMAT(ot.verified_at, '%Y-%m-%d %H:%i:%s') AS verified_at,
       DATE_FORMAT(ot.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
       CONCAT(op.program_name) AS program_name
     FROM outreach_transactions ot
     LEFT JOIN outreach_programs op ON op.id = ot.outreach_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ot.service_date DESC, ot.service_time DESC, ot.id DESC
     LIMIT 500`,
    params
  );

  if (!rows.length) return rows;

  const [items] = await db.query(
    `SELECT transaction_id, id, service_name, amount
     FROM outreach_transaction_items
     WHERE transaction_id IN (?)
     ORDER BY id ASC`,
    [rows.map((r) => r.id)]
  );

  const itemMap = {};
  for (const it of items) {
    (itemMap[it.transaction_id] = itemMap[it.transaction_id] || []).push({
      id: it.id,
      service_name: it.service_name,
      amount: numberOrNull(it.amount),
    });
  }
  rows = rows.map((r) => ({ ...r, items: itemMap[r.id] || [] }));
  return rows;
}

async function getOwnerPaymentHistory(req, res) {
  try {
    const [[owner]] = await db.query(
      "SELECT id, full_name FROM pet_owners WHERE user_id = ?",
      [req.user.id]
    );
    if (!owner) {
      return res.status(404).json({ success: false, message: "Owner profile not found." });
    }

    const { source, search, from, to } = req.query;

    // Everything the owner has ever paid, for the summary cards.
    const [allClinic, allOutreach] = await Promise.all([
      fetchClinicRecords(owner.id),
      fetchOutreachRecords(owner.full_name),
    ]);

    // Filtered copy for the table.
    const filters = { search, from, to };
    const clinicNeeded = !source || source === "clinic";
    const outreachNeeded = !source || source === "outreach";
    const [clinicRows, outreachRows] = await Promise.all([
      clinicNeeded ? fetchClinicRecords(owner.id, filters) : Promise.resolve([]),
      outreachNeeded ? fetchOutreachRecords(owner.full_name, filters) : Promise.resolve([]),
    ]);

    const clinicRecord = (r) => ({
      source: "clinic",
      id: r.id,
      ref: r.or_number,
      date: r.or_date,
      time: r.or_time,
      title: r.payment_type,
      description: r.or_description,
      amount: numberOrNull(r.or_amount),
      status: "Paid",
      payment_items: r.payment_items,
      medicine_name: r.medicine_name,
      medicine_quantity: r.medicine_quantity,
      medicine_total: numberOrNull(r.medicine_total),
      remarks: r.remarks,
      recorded_by_name: r.recorded_by_name,
      or_photo_path: r.or_photo_path,
      pm_token: r.pm_token,
      created_at: r.created_at,
      raw: r,
    });

    const outreachRecord = (r) => ({
      source: "outreach",
      id: r.id,
      ref: r.program_name || `Outreach #${r.id}`,
      date: r.service_date,
      time: r.service_time,
      title: r.program_name || "Outreach",
      description: null,
      amount: numberOrNull(r.total_amount),
      status: r.status,
      rejection_reason: r.rejection_reason,
      submitted_at: r.submitted_at,
      verified_at: r.verified_at,
      pet_name: r.pet_name,
      barangay: r.barangay,
      items: r.items || [],
      qr_token: r.qr_token,
      created_at: r.created_at,
      raw: r,
    });

    const records = [
      ...(clinicNeeded ? clinicRows.map(clinicRecord) : []),
      ...(outreachNeeded ? outreachRows.map(outreachRecord) : []),
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(a.time || "").localeCompare(String(b.time || "")));

    const clinicSum = allClinic.reduce((sum, r) => sum + (numberOrNull(r.or_amount) || 0), 0);
    const outreachSum = allOutreach.reduce((sum, r) => sum + (numberOrNull(r.total_amount) || 0), 0);

    const summary = {
      clinicCount: allClinic.length,
      clinicTotal: Number(clinicSum.toFixed(2)),
      outreachCount: allOutreach.length,
      outreachTotal: Number(outreachSum.toFixed(2)),
      overallCount: allClinic.length + allOutreach.length,
      overallTotal: Number((clinicSum + outreachSum).toFixed(2)),
    };

    res.json({ success: true, summary, records });
  } catch (error) {
    console.error("Owner payment history error:", error);
    res.status(500).json({ success: false, message: "Could not load payment history.", error: error.message });
  }
}

module.exports = { getOwnerPaymentHistory };