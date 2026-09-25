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

async function fetchClinicRecords(ownerId, filters = {}) {
  const conditions = [
    "po.id = ?",
    "(pm.consultation_id IS NOT NULL OR pm.payment_reference IS NOT NULL)",
  ];
  const params = [ownerId];

  const term = (filters.search || "").trim();
  if (term) {
    conditions.push("(pm.payment_reference LIKE ? OR pm.payment_type LIKE ? OR p.name LIKE ? OR p.pet_code LIKE ? OR po.full_name LIKE ?)");
    params.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
  }
  const paymentDate = "COALESCE(pm.consultation_date, DATE(pm.created_at))";
  const from = parseDate(filters.from);
  if (from) {
    conditions.push(`${paymentDate} >= ?`);
    params.push(from);
  }
  const to = parseDate(filters.to);
  if (to) {
    conditions.push(`${paymentDate} <= ?`);
    params.push(to);
  }

  const [rows] = await db.query(
    `SELECT
       pm.id,
       pm.consultation_id,
       pm.payment_reference,
       COALESCE(pm.payment_status, 'Unpaid') AS payment_status,
       COALESCE(pm.total_amount, 0) AS amount,
       DATE_FORMAT(${paymentDate}, '%Y-%m-%d') AS payment_date,
       TIME(pm.created_at) AS payment_time,
       COALESCE(pm.remarks, 'Consultation charges') AS description,
       pm.payment_items,
       pm.payment_type,
       pm.remarks,
       pm.recorded_by,
       ru.full_name AS recorded_by_name,
       p.name AS pet_name,
       p.pet_code
     FROM payment_monitoring pm
     LEFT JOIN consultation_records cr ON cr.id = pm.consultation_id
     LEFT JOIN pets p ON p.id = COALESCE(pm.pet_id, cr.pet_id)
     LEFT JOIN pet_owners po ON po.id = COALESCE(pm.pet_owner_id, p.pet_owner_id)
     LEFT JOIN users ru ON ru.id = pm.recorded_by
     WHERE ${conditions.join(" AND ")}
     ORDER BY payment_date DESC, payment_time DESC, pm.id DESC`,
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
      consultation_id: r.consultation_id,
      ref: r.payment_reference || `PM-${r.id}`,
      payment_reference: r.payment_reference,
      date: r.payment_date,
      time: r.payment_time,
      title: r.payment_type || "Consultation",
      description: r.description,
      amount: numberOrNull(r.amount),
      status: r.payment_status || "Unpaid",
      payment_items: r.payment_items,
      pet_name: r.pet_name,
      pet_code: r.pet_code,
      remarks: r.remarks,
      recorded_by_name: r.recorded_by_name,
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

    const clinicPaid = allClinic.filter((r) => r.payment_status === "Paid");
    const outreachPaid = allOutreach.filter((r) => r.status === "Verified");
    const clinicSum = clinicPaid.reduce((sum, r) => sum + (numberOrNull(r.amount) || 0), 0);
    const outreachSum = outreachPaid.reduce((sum, r) => sum + (numberOrNull(r.total_amount) || 0), 0);

    const summary = {
      clinicCount: allClinic.length,
      clinicPaidCount: clinicPaid.length,
      clinicUnpaidCount: allClinic.filter((r) => r.payment_status !== "Paid").length,
      clinicTotal: Number(clinicSum.toFixed(2)),
      outreachCount: allOutreach.length,
      outreachPaidCount: outreachPaid.length,
      outreachTotal: Number(outreachSum.toFixed(2)),
      overallCount: allClinic.length + allOutreach.length,
      overallPaidCount: clinicPaid.length + outreachPaid.length,
      overallTotal: Number((clinicSum + outreachSum).toFixed(2)),
    };

    res.json({ success: true, summary, records });
  } catch (error) {
    console.error("Owner payment history error:", error);
    res.status(500).json({ success: false, message: "Could not load payment history.", error: error.message });
  }
}

module.exports = { getOwnerPaymentHistory };