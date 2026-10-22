require("dotenv").config();

const db = require("../config/db");
const { ensureFollowupContacts } = require("../db/ensureFollowupContacts");

const YEAR = 2026;
const COMMENT_PREFIX = "ANALYTICS_SEED_2025:RETURN_REASON_SAMPLE_2026_";
const SAMPLE_CONTACT_NOTE = "Seeded demo sample; not an actual owner response.";
const SAMPLES = [
  { month: 1, day: 8, reasons: ["forgot_schedule"] },
  { month: 1, day: 19, reasons: ["no_reminder"] },
  { month: 2, day: 4, reasons: ["distance_transport"] },
  { month: 2, day: 17, reasons: ["clinic_hours"] },
  { month: 3, day: 6, reasons: ["cost"] },
  { month: 3, day: 21, reasons: ["other_clinic"] },
  { month: 4, day: 10, reasons: ["pet_health_fear"] },
  { month: 4, day: 24, reasons: ["forgot_schedule", "no_reminder"] },
  { month: 5, day: 9, reasons: ["distance_transport", "cost"] },
  { month: 5, day: 23, reasons: ["clinic_hours"] },
  { month: 6, day: 5, reasons: ["cost", "other_clinic"] },
  { month: 6, day: 18, reasons: ["forgot_schedule", "pet_health_fear"] },
];

function dateString(month, day) {
  return `${YEAR}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function getSeedRows() {
  const [pets] = await db.query(
    `SELECT id, species_id
     FROM pets
     WHERE LEFT(pet_code, 9) = 'ANL-2025-'
     ORDER BY id
     LIMIT ?`,
    [SAMPLES.length]
  );
  if (pets.length < SAMPLES.length) {
    throw new Error(`Expected at least ${SAMPLES.length} existing Analytics seed pets.`);
  }

  const [vaccines] = await db.query(
    `SELECT id, species_id
     FROM vaccines
     WHERE vaccine_name <> 'REGISTRATION FEE'
     ORDER BY id`
  );
  const [existingRecords] = await db.query(
    `SELECT id, comments
     FROM vaccination_records
     WHERE LEFT(comments, ${COMMENT_PREFIX.length}) = ?`,
    [COMMENT_PREFIX]
  );
  const existingByComment = new Map(existingRecords.map((row) => [row.comments, row.id]));

  return SAMPLES.map((sample, index) => {
    const pet = pets[index];
    const vaccine = vaccines.find(
      (row) => row.species_id == null || Number(row.species_id) === Number(pet.species_id)
    );
    if (!vaccine) throw new Error(`No vaccine applies to seed pet ${index + 1}.`);
    const suffix = String(index + 1).padStart(2, "0");
    const comments = `${COMMENT_PREFIX}${suffix}`;
    const administered = dateString(sample.month, sample.day);
    const due = new Date(`${administered}T00:00:00Z`);
    due.setUTCDate(due.getUTCDate() + 30);

    return {
      petId: pet.id,
      vaccineId: vaccine.id,
      comments,
      existingId: existingByComment.get(comments),
      administered,
      due: due.toISOString().slice(0, 10),
      contactedAt: `${YEAR}-10-01`,
      reasons: sample.reasons,
    };
  });
}

async function insertVaccination(record, id) {
  await db.query(
    `INSERT INTO vaccination_records
       (id, pet_id, vaccine_id, dose_label, date_administered, next_due_date,
        status, comments, created_at)
     VALUES (?, ?, ?, 'Seeded follow-up sample', ?, ?, 'Updated', ?, ?)` ,
    [
      id,
      record.petId,
      record.vaccineId,
      record.administered,
      record.due,
      record.comments,
      `${record.administered} 09:00:00`,
    ]
  );
}

async function insertContact(record, vaccinationId) {
  const values = [
    vaccinationId,
    JSON.stringify(record.reasons),
    SAMPLE_CONTACT_NOTE,
    record.contactedAt,
  ];
  if (db.dialect === "postgres") {
    await db.query(
      `INSERT INTO vaccine_followup_contacts
         (vaccination_record_id, contact_status, reasons_json, other_reason, contacted_at, contacted_by)
       VALUES (?, 'Reached', ?, ?, ?, NULL)
       ON CONFLICT (vaccination_record_id) DO NOTHING`,
      values
    );
  } else {
    await db.query(
      `INSERT INTO vaccine_followup_contacts
         (vaccination_record_id, contact_status, reasons_json, other_reason, contacted_at, contacted_by)
       VALUES (?, 'Reached', ?, ?, ?, NULL)
       ON DUPLICATE KEY UPDATE vaccination_record_id = VALUES(vaccination_record_id)`,
      values
    );
  }
}

async function applySeed(records) {
  const [[{ max_id: maxId }]] = await db.query(
    "SELECT COALESCE(MAX(id), 0) AS max_id FROM vaccination_records"
  );
  let nextId = Number(maxId) + 1;
  let createdVaccinations = 0;
  let createdContacts = 0;

  for (const record of records) {
    let vaccinationId = record.existingId;
    if (!vaccinationId) {
      vaccinationId = nextId++;
      await insertVaccination(record, vaccinationId);
      createdVaccinations += 1;
    }
    const [existingContacts] = await db.query(
      "SELECT vaccination_record_id FROM vaccine_followup_contacts WHERE vaccination_record_id = ?",
      [vaccinationId]
    );
    if (existingContacts.length) continue;
    await insertContact(record, vaccinationId);
    createdContacts += 1;
  }

  return { createdVaccinations, createdContacts };
}

async function main() {
  try {
    const ready = await ensureFollowupContacts();
    if (!ready) throw new Error("Could not prepare the follow-up contact table.");

    const records = await getSeedRows();
    if (!process.argv.includes("--apply")) {
      console.log(
        `Preview: ${records.length} sample follow-up reasons for ${YEAR}; ` +
        "no vaccination or contact records were inserted."
      );
      console.log("Run with --apply to add clearly tagged synthetic sample records.");
      return;
    }

    const result = await applySeed(records);
    console.log(
      `Seed complete for ${YEAR}: ${result.createdVaccinations} synthetic vaccine records and ` +
      `${result.createdContacts} sample reason contacts created.`
    );
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("Unable to seed Analytics retention reasons:", error.message);
  process.exitCode = 1;
});
