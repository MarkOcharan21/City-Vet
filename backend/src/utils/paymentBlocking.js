const db = require("../config/db");

const VAC_REF = /^VAC-(\d+)$/i;

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function emptyBlocking() {
  return {
    hasUnpaid: false,
    balance: 0,
    items: [],
    blocked: { consultations: [], vaccinations: [], prescriptions: [] },
  };
}

async function loadBlocking(rows) {
  const billable = rows.filter((r) => numberOrZero(r.total_amount) > 0);
  const items = billable.map((r) => ({
    id: r.id,
    pet_id: r.pet_id,
    payment_type: r.payment_type,
    payment_reference: r.payment_reference,
    consultation_id: r.consultation_id || null,
    amount: numberOrZero(r.total_amount),
    date: r.payment_date || null,
  }));

  if (items.length === 0) return emptyBlocking();

  const consultations = [...new Set(items.map((i) => i.consultation_id).filter(Boolean))];

  const vaccinations = [];
  for (const item of items) {
    const m = VAC_REF.exec(item.payment_reference || "");
    if (m && String(item.payment_type).toLowerCase() === "vaccination") {
      vaccinations.push(Number(m[1]));
    }
  }

  const prescriptions = [];
  if (consultations.length > 0) {
    const [prescriptionRows] = await db.query(
      `SELECT id FROM prescriptions WHERE consultation_id IN (?)`,
      [consultations]
    );
    for (const row of prescriptionRows) prescriptions.push(Number(row.id));
  }

  return {
    hasUnpaid: true,
    balance: items.reduce((sum, i) => sum + i.amount, 0),
    items,
    blocked: {
      consultations,
      vaccinations: [...new Set(vaccinations)],
      prescriptions,
    },
  };
}

async function getPetUnpaidBlocking(petId) {
  const [rows] = await db.query(
    `SELECT id, pet_id, payment_type, payment_reference, consultation_id, total_amount,
            COALESCE(consultation_date, DATE(created_at)) AS payment_date
       FROM payment_monitoring
      WHERE pet_id = ?
        AND payment_status = 'Unpaid'
        AND (consultation_id IS NOT NULL OR payment_reference IS NOT NULL)
      ORDER BY id DESC`,
    [petId]
  );
  return loadBlocking(rows);
}

async function getOwnerUnpaidBlocking(petIds) {
  const ids = (petIds || []).map(Number).filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return emptyBlocking();

  const [rows] = await db.query(
    `SELECT id, pet_id, payment_type, payment_reference, consultation_id, total_amount,
            COALESCE(consultation_date, DATE(created_at)) AS payment_date
       FROM payment_monitoring
      WHERE pet_id IN (?)
        AND payment_status = 'Unpaid'
        AND (consultation_id IS NOT NULL OR payment_reference IS NOT NULL)
      ORDER BY id DESC`,
    [ids]
  );
  return loadBlocking(rows);
}

module.exports = {
  emptyBlocking,
  getPetUnpaidBlocking,
  getOwnerUnpaidBlocking,
};