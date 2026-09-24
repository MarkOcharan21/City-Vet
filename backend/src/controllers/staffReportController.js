const db = require("../config/db");
const { vetNameExpr } = require("../utils/vetNameFormat");

// ---------------------------------------------------------------------------
// Staff printable reports
//
// Single endpoint:  GET /api/reports/:category?from=YYYY-MM-DD&to=YYYY-MM-DD
// Category is whitelisted below. `from`/`to` are optional; when omitted the
// report covers ALL records. Each report returns:
//   report.summaryCards  -> [{ label, value }]  (aggregate summary block)
//   report.table         -> { title, columns: [{ key, label, format }], rows: [...] }
// The front end renders this into a print-ready A4 document.
// ---------------------------------------------------------------------------

const CATEGORIES = {
  pets: { label: "Pet Registrations", reportTitle: "Pet Registration Report" },
  vaccinations: { label: "Vaccination Report", reportTitle: "Vaccination Report" },
  clinical: { label: "Clinical Consultations", reportTitle: "Clinical Consultation Report" },
  medicine: { label: "Medicine / Prescription Report", reportTitle: "Medicine / Prescription Report" },
  payments: { label: "Payment Monitoring Report", reportTitle: "Payment Monitoring Report" },
  outreach: { label: "Outreach Transactions Report", reportTitle: "Outreach Transactions Report" },
  requests: { label: "Record Requests Report", reportTitle: "Record Requests Report" },
};

function parseDate(value) {
  if (!value || typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return value; // validated YYYY-MM-DD
}

function money(n) {
  return Number(n || 0).toFixed(2);
}

function rangeClause(column, from, to) {
  const clauses = [];
  const params = [];
  if (from) {
    clauses.push(`${column} >= ?`);
    params.push(from);
  }
  if (to) {
    clauses.push(`${column} <= ?`);
    params.push(to);
  }
  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

// ---------------------------------------------------------------------------
// Category builders — each returns { summaryCards, table }
// ---------------------------------------------------------------------------

async function buildPets(from, to) {
  const { where, params } = rangeClause("p.registration_date", from, to);
  const [rows] = await db.query(
    `
    SELECT
      p.pet_code, p.name AS pet_name, s.species_name,
      COALESCE(b.breed_name, p.breed_custom) AS breed_name,
      p.sex, p.color, p.birthdate, p.registration_date, p.status, p.is_lost,
      po.full_name AS owner_name, po.barangay,
      q.qr_status, q.qr_issue
    FROM pets p
    JOIN pet_owners po ON p.pet_owner_id = po.id
    LEFT JOIN species s ON p.species_id = s.id
    LEFT JOIN breeds b ON p.breed_id = b.id
    LEFT JOIN (
      SELECT pet_id, MAX(status) AS qr_status, MAX(issue_date) AS qr_issue
      FROM qr_codes
      GROUP BY pet_id
    ) q ON q.pet_id = p.id
    ${where}
    ORDER BY p.registration_date DESC, p.pet_code ASC
    `,
    params
  );

  const verified = rows.filter((r) => r.status === "Verified").length;
  const dogs = rows.filter((r) => r.species_name === "Dog").length;
  const cats = rows.filter((r) => r.species_name === "Cat").length;
  const barangays = new Set(rows.map((r) => r.barangay).filter(Boolean)).size;

  return {
    summaryCards: [
      { label: "Total Pets", value: rows.length },
      { label: "Verified", value: verified },
      { label: "Pending / Registered", value: rows.length - verified },
      { label: "Dogs", value: dogs },
      { label: "Cats", value: cats },
      { label: "Barangays Covered", value: barangays },
    ],
    table: {
      title: "Registered Pets",
      columns: [
        { key: "registration_date", label: "Registration Date", format: "date" },
        { key: "pet_code", label: "Pet ID" },
        { key: "pet_name", label: "Pet Name" },
        { key: "species_name", label: "Species" },
        { key: "breed_name", label: "Breed" },
        { key: "sex", label: "Sex" },
        { key: "color", label: "Color" },
        { key: "owner_name", label: "Owner" },
        { key: "barangay", label: "Barangay" },
        { key: "qr_status", label: "QR Status" },
        { key: "status", label: "Status" },
      ],
      rows,
    },
  };
}

async function buildVaccinations(from, to) {
  const { where, params } = rangeClause("vr.date_administered", from, to);
  const [rows] = await db.query(
    `
    SELECT
      vr.date_administered, vr.next_due_date, vr.dose_no, vr.dose_label,
      vr.status AS stored_status, v.vaccine_name,
      p.pet_code, p.name AS pet_name, po.full_name AS owner_name, po.barangay
    FROM vaccination_records vr
    JOIN vaccines v ON vr.vaccine_id = v.id
    JOIN pets p ON vr.pet_id = p.id
    JOIN pet_owners po ON p.pet_owner_id = po.id
    ${where}
    ORDER BY vr.date_administered DESC
    `,
    params
  );

  const uniquePets = new Set(rows.map((r) => r.pet_code)).size;
  const uniqueVaccines = new Set(rows.map((r) => r.vaccine_name).filter(Boolean)).size;

  return {
    summaryCards: [
      { label: "Total Vaccinated", value: rows.length },
      { label: "Pets Vaccinated", value: uniquePets },
      { label: "Vaccine Types Used", value: uniqueVaccines },
    ],
    table: {
      title: "Vaccination Records",
      columns: [
        { key: "date_administered", label: "Date Administered", format: "date" },
        { key: "vaccine_name", label: "Vaccine" },
        { key: "dose_label", label: "Dose" },
        { key: "pet_code", label: "Pet ID" },
        { key: "pet_name", label: "Pet Name" },
        { key: "owner_name", label: "Owner" },
        { key: "barangay", label: "Barangay" },
        { key: "next_due_date", label: "Next Due", format: "date" },
        { key: "stored_status", label: "Status" },
      ],
      rows,
    },
  };
}

async function buildClinical(from, to) {
  const { where, params } = rangeClause("cr.consultation_date", from, to);
  const [rows] = await db.query(
    `
    SELECT
      cr.consultation_date, cr.follow_up_date, cr.diagnosis, cr.treatment_plan,
      p.pet_code, p.name AS pet_name, po.full_name AS owner_name, po.barangay,
      ${vetNameExpr('vet_name')}
    FROM consultation_records cr
    JOIN pets p ON cr.pet_id = p.id
    JOIN pet_owners po ON p.pet_owner_id = po.id
    LEFT JOIN users u ON cr.vet_id = u.id
    ${where}
    ORDER BY cr.consultation_date DESC
    `,
    params
  );

  const uniquePets = new Set(rows.map((r) => r.pet_code)).size;
  const uniqueVets = new Set(rows.map((r) => r.vet_name).filter(Boolean)).size;
  const withFollowUp = rows.filter((r) => r.follow_up_date).length;

  return {
    summaryCards: [
      { label: "Total Consultations", value: rows.length },
      { label: "Pets Consulted", value: uniquePets },
      { label: "Veterinarians", value: uniqueVets },
      { label: "Follow-ups Scheduled", value: withFollowUp },
    ],
    table: {
      title: "Clinical Consultation Records",
      columns: [
        { key: "consultation_date", label: "Consultation Date", format: "date" },
        { key: "pet_code", label: "Pet ID" },
        { key: "pet_name", label: "Pet Name" },
        { key: "owner_name", label: "Owner" },
        { key: "barangay", label: "Barangay" },
        { key: "diagnosis", label: "Diagnosis" },
        { key: "treatment_plan", label: "Treatment Plan" },
        { key: "follow_up_date", label: "Follow-up Date", format: "date" },
        { key: "vet_name", label: "Recorded By" },
      ],
      rows,
    },
  };
}

async function buildMedicine(from, to) {
  const { where, params } = rangeClause("pr.prescribed_date", from, to);
  const [rows] = await db.query(
    `
    SELECT
      pr.prescribed_date, pr.id AS prescription_id,
      p.pet_code, p.name AS pet_name, po.full_name AS owner_name, po.barangay,
      m.medicine_name, pi.quantity, pi.dosage, pi.frequency, pi.duration, pi.instructions,
      ${vetNameExpr('vet_name')}
    FROM prescriptions pr
    JOIN consultation_records cr ON pr.consultation_id = cr.id
    JOIN pets p ON cr.pet_id = p.id
    JOIN pet_owners po ON p.pet_owner_id = po.id
    LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
    LEFT JOIN medicines m ON pi.medicine_id = m.id
    LEFT JOIN users u ON cr.vet_id = u.id
    ${where}
    ORDER BY pr.prescribed_date DESC, pr.id DESC
    `,
    params
  );

  const uniquePrescriptions = new Set(rows.map((r) => r.prescription_id)).size;
  const uniquePets = new Set(rows.map((r) => r.pet_code)).size;
  const uniqueMedicines = new Set(rows.map((r) => r.medicine_name).filter(Boolean)).size;

  return {
    summaryCards: [
      { label: "Total Prescriptions", value: uniquePrescriptions },
      { label: "Medicine Lines", value: rows.length },
      { label: "Medicines Used", value: uniqueMedicines },
      { label: "Pets Prescribed", value: uniquePets },
    ],
    table: {
      title: "Prescription / Medicine Records",
      columns: [
        { key: "prescribed_date", label: "Prescribed Date", format: "date" },
        { key: "pet_code", label: "Pet ID" },
        { key: "pet_name", label: "Pet Name" },
        { key: "owner_name", label: "Owner" },
        { key: "barangay", label: "Barangay" },
        { key: "medicine_name", label: "Medicine" },
        { key: "quantity", label: "Quantity" },
        { key: "dosage", label: "Dosage" },
        { key: "frequency", label: "Frequency" },
        { key: "duration", label: "Duration" },
        { key: "vet_name", label: "Prescribed By" },
      ],
      rows,
    },
  };
}

async function buildPayments(from, to) {
  const { where, params } = rangeClause("pm.or_date", from, to);
  const [rows] = await db.query(
    `
    SELECT
      pm.or_date, pm.or_time, pm.or_number, pm.payment_type, pm.or_amount,
      pm.or_description, pm.medicine_quantity,
      po.full_name AS owner_name, po.barangay,
      COALESCE(m.medicine_name, '') AS medicine_name,
      ${vetNameExpr('recorded_by_name')}
    FROM payment_monitoring pm
    JOIN pet_owners po ON pm.pet_owner_id = po.id
    JOIN users u ON pm.recorded_by = u.id
    LEFT JOIN medicines m ON pm.medicine_id = m.id
    ${where}
    ORDER BY pm.or_date DESC, pm.or_time DESC
    `,
    params
  );

  const totalAmount = rows.reduce((sum, r) => sum + Number(r.or_amount || 0), 0);
  const byType = {};
  for (const r of rows) {
    byType[r.payment_type] = (byType[r.payment_type] || 0) + 1;
  }

  return {
    summaryCards: [
      { label: "Total Payments", value: rows.length },
      { label: "Total Amount", value: `P ${money(totalAmount)}` },
      { label: "Consultations", value: byType.Consultation || 0 },
      { label: "Vaccinations", value: byType.Vaccination || 0 },
      { label: "Medicine", value: byType.Medicine || 0 },
    ],
    table: {
      title: "Payment Monitoring Records",
      columns: [
        { key: "or_date", label: "OR Date", format: "date" },
        { key: "or_time", label: "Time", format: "time" },
        { key: "or_number", label: "OR Number" },
        { key: "owner_name", label: "Owner" },
        { key: "barangay", label: "Barangay" },
        { key: "payment_type", label: "Payment Type" },
        { key: "medicine_name", label: "Medicine" },
        { key: "or_amount", label: "Amount", format: "money" },
        { key: "recorded_by_name", label: "Recorded By" },
      ],
      rows,
    },
  };
}

async function buildOutreach(from, to) {
  const { where, params } = rangeClause("ot.service_date", from, to);
  const [rows] = await db.query(
    `
    SELECT
      ot.service_date, ot.service_time, ot.total_amount, ot.status,
      ot.owner_name, ot.owner_contact, ot.pet_name, ot.barangay,
      op.program_name, oi.services
    FROM outreach_transactions ot
    JOIN outreach_programs op ON ot.outreach_id = op.id
    LEFT JOIN (
      SELECT transaction_id, GROUP_CONCAT(service_name SEPARATOR ', ') AS services
      FROM outreach_transaction_items
      GROUP BY transaction_id
    ) oi ON oi.transaction_id = ot.id
    ${where}
    ORDER BY ot.service_date DESC, ot.service_time DESC
    `,
    params
  );

  const collected = rows
    .filter((r) => r.status === "Verified")
    .reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
  const statusCount = {};
  for (const r of rows) statusCount[r.status] = (statusCount[r.status] || 0) + 1;

  return {
    summaryCards: [
      { label: "Total Transactions", value: rows.length },
      { label: "Collected", value: `P ${money(collected)}` },
      { label: "Verified", value: statusCount.Verified || 0 },
      { label: "Pending", value: statusCount.Pending || 0 },
      { label: "Rejected", value: statusCount.Rejected || 0 },
    ],
    table: {
      title: "Outreach Transactions",
      columns: [
        { key: "service_date", label: "Service Date", format: "date" },
        { key: "service_time", label: "Time", format: "time" },
        { key: "program_name", label: "Program" },
        { key: "owner_name", label: "Owner" },
        { key: "pet_name", label: "Pet" },
        { key: "barangay", label: "Barangay" },
        { key: "services", label: "Services" },
        { key: "total_amount", label: "Amount", format: "money" },
        { key: "status", label: "Status" },
      ],
      rows,
    },
  };
}

async function buildRequests(from, to) {
  const { where, params } = rangeClause("rr.requested_date", from, to);
  const [rows] = await db.query(
    `
    SELECT
      rr.requested_date, rr.request_type, rr.purpose, rr.format, rr.comments,
      rr.status, rr.issued_date,
      po.full_name AS owner_name, po.barangay,
      p.pet_code, p.name AS pet_name
    FROM record_requests rr
    JOIN pet_owners po ON rr.pet_owner_id = po.id
    JOIN pets p ON rr.pet_id = p.id
    ${where}
    ORDER BY rr.requested_date DESC
    `,
    params
  );

  const issued = rows.filter((r) => r.status === "Issued").length;
  const open = rows.length - issued;
  const byType = {};
  for (const r of rows) byType[r.request_type] = (byType[r.request_type] || 0) + 1;

  return {
    summaryCards: [
      { label: "Total Requests", value: rows.length },
      { label: "Issued", value: issued },
      { label: "Pending", value: open },
      { label: "Types", value: Object.keys(byType).length },
    ],
    table: {
      title: "Record Request List",
      columns: [
        { key: "requested_date", label: "Requested Date", format: "date" },
        { key: "owner_name", label: "Owner" },
        { key: "pet_code", label: "Pet ID" },
        { key: "pet_name", label: "Pet Name" },
        { key: "request_type", label: "Request Type" },
        { key: "purpose", label: "Purpose" },
        { key: "format", label: "Format" },
        { key: "status", label: "Status" },
        { key: "issued_date", label: "Issued Date", format: "date" },
      ],
      rows,
    },
  };
}

const BUILDERS = {
  pets: buildPets,
  vaccinations: buildVaccinations,
  clinical: buildClinical,
  medicine: buildMedicine,
  payments: buildPayments,
  outreach: buildOutreach,
  requests: buildRequests,
};

async function getReport(req, res) {
  try {
    const { category } = req.params;
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);

    const builder = BUILDERS[category];
    if (!builder) {
      return res.status(400).json({
        success: false,
        message: `Unknown report category "${category}".`,
      });
    }

    const [[user]] = await db.query("SELECT full_name FROM users WHERE id = ?", [req.user.id]);
    const generatedBy = user?.full_name || req.user.email || "Staff";

    const { summaryCards, table } = await builder(from, to);

    res.json({
      success: true,
      report: {
        category,
        label: CATEGORIES[category].label,
        reportTitle: CATEGORIES[category].reportTitle || CATEGORIES[category].label,
        from,
        to,
        generatedBy,
        generatedAt: new Date(),
        summaryCards,
        table,
      },
    });
  } catch (error) {
    console.error("Error in staff report:", error);
    res.status(500).json({
      success: false,
      message: "Could not generate the report.",
      error: error.message,
    });
  }
}

module.exports = { getReport, CATEGORIES };