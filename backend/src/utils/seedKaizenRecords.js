// seedKaizenRecords.js — consultation + medicine (prescription) demo records
// for owner "Kaizen Brix S. Trinidad" so his owner portal (Consultation &
// Medicine Records, dashboard activity, due/follow-up summaries) has data.
//
// Run:  node src/utils/seedKaizenRecords.js
//
// Two phases, each idempotent (safe to run more than once):
//   Phase 1 — recent records → show up under "Active Medications"
//             (skipped if the owner already has any prescription)
//   Phase 2 — older records (> 60 days) → populate "Medication History"
//             (skipped if the owner already has a prescription older than 60 days)
//   Phase 3 — Digital Pet Booklet completeness: every section of the booklet
//             (Pet Profile, Vaccinations, Medical History, Medications,
//             Preventive Care, Procedures, Emergency) is filled with distinct,
//             non-empty records so no "—" placeholder ever renders.
//             Skips work already done (idempotent).
//   Phase 4 — Payment records (Paid + Verified) for every pet so
//             "Payment Status / latest payment" reads never show "—".
//             Skips any pet that already has a payment (idempotent).
//   Phase 5 — Record requests covering every request type (all Pending)
//             so the staff "Issue Requested Records" page can render and
//             print each type-specific document format.
//             Skips any pet+type pair already requested (idempotent).

require("dotenv").config();
const db = require("../config/db");

const OWNER_NAME = "Kaizen Brix S. Trinidad";
const ACTIVE_WINDOW_DAYS = 60;

function iso(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Each plan: { pet, diagnosis, plan, daysAgo, followUpDays (null = none), meds: [ [name, quantity, dosage, frequency, duration, instructions], ... ] }
const RECENT_PLANS = [
  {
    pet: "Choco",
    diagnosis: "Tick fever suspected",
    plan: "CBC and blood smear requested; oral doxycycline course; recheck after treatment.",
    date: -14,
    followUp: -8,
    meds: [
      ["Doxycycline", "20 tablets", "1 tablet", "2x daily", "7 days", "After meals"],
      ["Vitamin B Complex", "10 tablets", "1 tablet", "1x daily", "10 days", "With food"],
    ],
  },
  {
    pet: "Max",
    diagnosis: "Upper respiratory infection (URI)",
    plan: "Supportive care, eye and nasal cleaning, and a short antibiotic course.",
    date: -7,
    followUp: 7,
    meds: [
      ["Amoxicillin", "14 tablets", "0.5 tablet", "2x daily", "7 days", "After meals"],
      ["Oral Rehydration Salts", "5 sachets", "1 sachet", "1x daily", "5 days", "Mix with drinking water"],
    ],
  },
  {
    pet: "Hachikow",
    diagnosis: "Mild gastroenteritis / diarrhea",
    plan: "Gastroprotectants, bland diet for 3 days, hydration support, and stool check.",
    date: -3,
    followUp: 0,
    meds: [
      ["Metronidazole", "10 tablets", "1 tablet", "2x daily", "5 days", "After meals"],
      ["Pyrantel Pamoate", "2 tablets", "1 tablet", "1x daily", "2 days", "Single morning dose"],
      ["Oral Rehydration Salts", "3 sachets", "1 sachet", "1x daily", "3 days", "Mix with drinking water"],
    ],
  },
  {
    pet: "Melay",
    diagnosis: "Flea allergy dermatitis with pruritus",
    plan: "Flea control, antihistamine, and household environmental sanitization.",
    date: -9,
    followUp: 1,
    meds: [
      ["Chlorpheniramine", "14 tablets", "0.5 tablet", "2x daily", "7 days", "After meals"],
      ["Frontline Spray", "1 bottle", "2 sprays", "1x weekly", "4 weeks", "Apply on skin between shoulder blades"],
    ],
  },
  {
    pet: "Molly",
    diagnosis: "Neonatal wellness exam",
    plan: "Newborn checkup; weigh weekly, monitor nursing, and schedule first deworming at 6 weeks.",
    date: -3,
    followUp: 14,
    meds: [
      ["Vitamin B Complex", "10 tablets", "1 tablet", "1x daily", "10 days", "Crush and mix with milk or food"],
    ],
  },
];

const HISTORY_PLANS = [
  {
    pet: "Choco",
    diagnosis: "Skin infection / pyoderma",
    plan: "Topical and systemic antibiotic course completed; follow-up at the clinic for skin check.",
    date: -165,
    followUp: null,
    meds: [
      ["Enrofloxacin (Baytril)", "14 tablets", "1 tablet", "2x daily", "7 days", "After meals"],
      ["Prednisolone", "10 tablets", "0.5 tablet", "1x daily", "5 days", "With food"],
    ],
  },
  {
    pet: "Choco",
    diagnosis: "Dental disease (tartar)",
    plan: "Dental prophylaxis performed; home dental care advised with prescribed pain relief.",
    date: -280,
    followUp: null,
    meds: [
      ["Carprofen", "6 tablets", "1 tablet", "1x daily", "3 days", "After meals"],
    ],
  },
  {
    pet: "Max",
    diagnosis: "Flea infestation",
    plan: "Flea control applied and household environment treated; monitor for recurrence.",
    date: -110,
    followUp: null,
    meds: [
      ["Frontline Spray", "1 bottle", "2 sprays", "1x weekly", "4 weeks", "Apply on skin between shoulder blades"],
      ["Chlorpheniramine", "10 tablets", "0.5 tablet", "2x daily", "5 days", "After meals"],
    ],
  },
  {
    pet: "Hachikow",
    diagnosis: "Deworming follow-up",
    plan: "Fecalysis done and broad-spectrum dewormer given; repeat in 6 months.",
    date: -200,
    followUp: null,
    meds: [
      ["Pyrantel Pamoate", "2 tablets", "1 tablet", "1x daily", "2 days", "Single morning dose"],
      ["Vitamin B Complex", "10 tablets", "1 tablet", "1x daily", "10 days", "With food"],
    ],
  },
  {
    pet: "Melay",
    diagnosis: "Ear mite infestation",
    plan: "Topical miticide applied; treat all in-contact pets and recheck in two weeks.",
    date: -95,
    followUp: null,
    meds: [
      ["Ivermectin", "3 mL", "2 drops", "2x daily", "10 days", "Into the ear canal"],
    ],
  },
];

async function seed() {
  const [[owner]] = await db.query(
    `SELECT po.id AS owner_id, po.full_name
     FROM pet_owners po
     WHERE po.full_name = ?`,
    [OWNER_NAME]
  );
  if (!owner) {
    console.log(`Owner "${OWNER_NAME}" not found. Nothing to seed.`);
    await db.end();
    process.exit(0);
  }

  const [pets] = await db.query(
    `SELECT id, name FROM pets WHERE pet_owner_id = ?`,
    [owner.owner_id]
  );

  const [vets] = await db.query(
    "SELECT id FROM users WHERE role = 'Veterinarian' ORDER BY id"
  );
  if (!vets.length) {
    console.log("No veterinarian accounts found. Nothing to seed.");
    await db.end();
    process.exit(0);
  }

  const [medicines] = await db.query("SELECT id, medicine_name FROM medicines");
  const medId = (name) => {
    const row = medicines.find((m) => m.medicine_name === name);
    if (!row) console.warn(`WARN: medicine "${name}" not in table; skipping its item`);
    return row ? row.id : null;
  };

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const vetIds = vets.map((v) => v.id);
  let cons = 0;
  let rx = 0;
  let items = 0;

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    const [[{ existingRx }]] = await db.query(
      `SELECT COUNT(*) AS existingRx
       FROM prescriptions pr
       JOIN consultation_records cr ON pr.consultation_id = cr.id
       JOIN pets p ON cr.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE po.id = ?`,
      [owner.owner_id]
    );

    const [[{ historyRx }]] = await db.query(
      `SELECT COUNT(*) AS historyRx
       FROM prescriptions pr
       JOIN consultation_records cr ON pr.consultation_id = cr.id
       JOIN pets p ON cr.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE po.id = ? AND pr.prescribed_date < DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [owner.owner_id, ACTIVE_WINDOW_DAYS]
    );

    const seedPlans = async (plans, vetOffset) => {
      for (const plan of plans) {
        const pet = pets.find((p) => p.name.toLowerCase() === plan.pet.toLowerCase());
        if (!pet) {
          console.warn(`WARN: pet "${plan.pet}" not found for ${OWNER_NAME}; skipping plan`);
          continue;
        }

        const cDate = addDays(today, plan.date);
        const followUp = plan.followUp == null ? null : addDays(today, plan.followUp);
        const [cr] = await conn.query(
          `INSERT INTO consultation_records (pet_id, diagnosis, treatment_plan, consultation_date, follow_up_date, vet_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            pet.id,
            plan.diagnosis,
            plan.plan,
            iso(cDate),
            followUp ? iso(followUp) : null,
            vetIds[(cons + vetOffset) % vetIds.length],
          ]
        );
        cons++;

        const [prescriptionResult] = await conn.query(
          `INSERT INTO prescriptions (consultation_id, prescribed_date) VALUES (?, ?)`,
          [cr.insertId, iso(cDate)]
        );
        rx++;

        for (const [name, quantity, dosage, frequency, duration, instructions] of plan.meds) {
          const mid = medId(name);
          if (!mid) continue;
          await conn.query(
            `INSERT INTO prescription_items
               (prescription_id, medicine_id, quantity, dosage, frequency, duration, instructions)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [prescriptionResult.insertId, mid, quantity, dosage, frequency, duration, instructions]
          );
          items++;
        }
      }
    };

    if (Number(existingRx) > 0) {
      console.log(`Phase 1 (active) skipped: owner already has ${existingRx} prescription(s).`);
    } else {
      await seedPlans(RECENT_PLANS, 0);
      console.log(`Phase 1 (active) done: ${RECENT_PLANS.length} consultations + prescriptions.`);
    }

    if (Number(historyRx) > 0) {
      console.log(`Phase 2 (history) skipped: owner already has ${historyRx} history prescription(s).`);
    } else {
      await seedPlans(HISTORY_PLANS, RECENT_PLANS.length);
      console.log(`Phase 2 (history) done: ${HISTORY_PLANS.length} consultations + prescriptions.`);
    }

    // ======================================================
    // Phase 3 — Digital Pet Booklet completeness
    // ======================================================
    const COMPLAINT_BY_DIAGNOSIS = [
      { match: "Tick fever", complaint: "Fever, lethargy and reduced appetite" },
      { match: "Upper respiratory", complaint: "Sneezing, nasal discharge and runny eyes" },
      { match: "gastroenteritis", complaint: "Loose stools and occasional vomiting" },
      { match: "Flea allergy", complaint: "Frequent scratching and patchy hair loss" },
      { match: "Neonatal", complaint: "Routine newborn wellness check" },
      { match: "pyoderma", complaint: "Itchy red skin with flaking and mild odor" },
      { match: "Dental disease", complaint: "Bad breath and yellowish tartar on teeth" },
      { match: "Flea infestation", complaint: "Excessive scratching and visible fleas" },
      { match: "Deworming", complaint: "Post-deworming follow-up check" },
      { match: "Ear mite", complaint: "Head shaking, scratching ears and dark ear debris" },
      { match: "anti-rabies", complaint: "Routine anti-rabies vaccination visit" },
    ];
    const DEFAULT_COMPLAINT = "Routine wellness consultation";

    const VACCINATION_NOTES = {
      "Anti-Rabies": "Rabies booster administered; yearly re-vaccination advised.",
      "5-in-1 (DHPPL)": "Combined distemper, hepatitis, parvovirus and leptospirosis booster given.",
      "FVRCP (3-in-1)": "Feline rhinotracheitis, calicivirus and panleukopenia vaccine given.",
      "REGISTRATION FEE": "Registration fee verified; QR tag issued for the pet.",
    };

    // Distinct, non-empty records per pet (each pet gets its own set).
    const PREVENTIVE_BY_PET = {
      Max: { care_type: "Flea / Tick Preventive", product_name: "Frontline Plus", date: "2026-09-11", next: "2026-10-11", by: "Dr. Andrea Ramos" },
      Hachikow: { care_type: "Deworming", product_name: "Pyrantel Pamoate", date: "2026-09-08", next: "2026-12-08", by: "Dr. Andrei Parala" },
      Melay: { care_type: "Flea / Tick Preventive", product_name: "Revolution", date: "2026-09-12", next: "2026-11-02", by: "Dr. Cathy Lim" },
      Molly: { care_type: "Deworming", product_name: "Piperazine", date: "2026-09-16", next: "2026-10-16", by: "Dr. Andrea Ramos" },
    };

    const PROCEDURES_BY_PET = [
      { pet: "Choco", procedure_type: "Dental", procedure_name: "Dental Prophylaxis", date: "2026-01-15", vet: "Dr. Cathy Lim", notes: "Scaling and polishing completed; tartar removed under light sedation." },
      { pet: "Max", procedure_type: "Grooming", procedure_name: "Bath and Coat Grooming", date: "2026-09-10", vet: "Dr. Andrea Ramos", notes: "Bath, brushing and nail trimming completed." },
      { pet: "Hachikow", procedure_type: "Laboratory", procedure_name: "Fecalysis", date: "2026-09-06", vet: "Dr. Andrei Parala", notes: "No intestinal parasite ova seen." },
      { pet: "Melay", procedure_type: "Laboratory", procedure_name: "Skin Scraping / Tape Impression", date: "2026-09-10", vet: "Dr. Cathy Lim", notes: "Smear confirmed flea dirt and mild skin inflammation." },
      { pet: "Molly", procedure_type: "Other", procedure_name: "Newborn Wellness Assist", date: "2026-09-16", vet: "Dr. Andrea Ramos", notes: "Vital signs stable; puppy nursing well." },
    ];

    const EMERGENCY_BY_PET = {
      Max: { allergies: "pollen, insect bites", current_medication: "none", conditions: "none", instructions: "Indoor cat; keep separate from other cats while on treatment." },
      Hachikow: { allergies: "none", current_medication: "none", conditions: "sensitive stomach", instructions: "Feed small, frequent meals for the next week." },
      Melay: { allergies: "chicken, flea saliva", current_medication: "Chlorpheniramine", conditions: "none", instructions: "Treat all household pets for fleas at the same time." },
      Molly: { allergies: "none", current_medication: "Vitamin B Complex", conditions: "none", instructions: "Weigh weekly; schedule first deworming at six weeks of age." },
    };

    const petId = (name) => pets.find((p) => p.name.toLowerCase() === name.toLowerCase())?.id;

    // 3a. Medical History — every consultation needs a complaint.
    const [conDocs] = await db.query(
      `SELECT c.id, c.diagnosis
       FROM consultation_records c
       JOIN pets p ON c.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE po.id = ? AND (c.complaint IS NULL OR c.complaint = '')`,
      [owner.owner_id]
    );
    for (const row of conDocs) {
      const hit = COMPLAINT_BY_DIAGNOSIS.find((d) =>
        String(row.diagnosis || "").toLowerCase().includes(d.match.toLowerCase())
      );
      await conn.query(
        `UPDATE consultation_records SET complaint = ? WHERE id = ?`,
        [hit ? hit.complaint : DEFAULT_COMPLAINT, row.id]
      );
    }

    // 3b. Vaccination Record — fill missing remarks / next-due dates.
    // NOTE: vaccination_records.id is unreliable in this DB (every row is 0),
    // so updates key on pet_id + vaccine_id instead of id.
    const [vacDocs] = await db.query(
      `SELECT v.pet_id, v.vaccine_id, vac.vaccine_name
       FROM vaccination_records v
       JOIN vaccines vac ON v.vaccine_id = vac.id
       JOIN pets p ON v.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       WHERE po.id = ?
       GROUP BY v.pet_id, v.vaccine_id, vac.vaccine_name`,
      [owner.owner_id]
    );
    for (const row of vacDocs) {
      await conn.query(
        `UPDATE vaccination_records SET comments = ? WHERE pet_id = ? AND vaccine_id = ?`,
        [VACCINATION_NOTES[row.vaccine_name] || "Vaccination administered at the City Veterinary Clinic.", row.pet_id, row.vaccine_id]
      );
    }
    // Registration-fee pseudo-row has no next due date → set a one-year date so
    // the booklet's "Next Due" column never renders "—".
    await conn.query(
      `UPDATE vaccination_records v
       JOIN vaccines vac ON v.vaccine_id = vac.id
       JOIN pets p ON v.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       SET v.next_due_date = DATE_ADD(v.date_administered, INTERVAL 365 DAY), v.status = 'Updated'
       WHERE po.id = ? AND vac.id = 0 AND v.next_due_date IS NULL`,
      [owner.owner_id]
    );

    // 3c. Molly has no vaccination record yet → seed her first puppy dose.
    const mollyId = petId("Molly");
    if (mollyId) {
      const [[{ mollyVax }]] = await db.query(
        `SELECT COUNT(*) AS mollyVax FROM vaccination_records WHERE pet_id = ?`,
        [mollyId]
      );
      if (Number(mollyVax) === 0) {
        await conn.query(
          `INSERT INTO vaccination_records
             (pet_id, vaccine_id, dose_no, dose_label, date_administered, next_due_date, status, administered_by, comments)
           VALUES (?, 2, 1, 'First Dose', '2026-09-21', '2026-10-21', 'Updated', 1266,
                   'First puppy vaccine series started; follow the scheduled boosters.')`,
          [mollyId]
        );
        console.log(`  seeded Molly's first vaccination record.`);
      }
    }

    // 3d. Preventive care — seed one distinct record per pet that has none.
    for (const [petName, pc] of Object.entries(PREVENTIVE_BY_PET)) {
      const pid = petId(petName);
      if (!pid) continue;
      const [[{ prevCount }]] = await db.query(
        `SELECT COUNT(*) AS prevCount FROM preventive_care_records WHERE pet_id = ?`,
        [pid]
      );
      if (Number(prevCount) === 0) {
        await conn.query(
          `INSERT INTO preventive_care_records
             (pet_id, care_type, product_name, date_administered, next_due_date, administered_by, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [pid, pc.care_type, pc.product_name, pc.date, pc.next, pc.by, "Routine preventive treatment at the clinic."]
        );
      }
    }

    // 3e. Procedures — seed one distinct procedure per pet that has none.
    for (const proc of PROCEDURES_BY_PET) {
      const pid = petId(proc.pet);
      if (!pid) continue;
      const [[{ procExists }]] = await db.query(
        `SELECT COUNT(*) AS procExists FROM pet_procedures WHERE pet_id = ? AND procedure_name = ?`,
        [pid, proc.procedure_name]
      );
      if (Number(procExists) === 0) {
        await conn.query(
          `INSERT INTO pet_procedures
             (pet_id, procedure_type, procedure_name, procedure_date, veterinarian, result_notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [pid, proc.procedure_type, proc.procedure_name, proc.date, proc.vet, proc.notes]
        );
      }
    }

    // 3f. Emergency info — fill the per-pet medical flags left as NULL.
    for (const [petName, e] of Object.entries(EMERGENCY_BY_PET)) {
      const pid = petId(petName);
      if (!pid) continue;
      await conn.query(
        `UPDATE pets
         SET allergies = COALESCE(NULLIF(allergies, ''), ?),
             current_medication = COALESCE(NULLIF(current_medication, ''), ?),
             important_conditions = COALESCE(NULLIF(important_conditions, ''), ?),
             special_instructions = COALESCE(NULLIF(special_instructions, ''), ?)
         WHERE id = ?`,
        [e.allergies, e.current_medication, e.conditions, e.instructions, pid]
      );
    }

    // 3g. Sweep out placeholder "Dr. Test" entries left in the demo data.
    await conn.query(
      `UPDATE preventive_care_records pcr
       JOIN pets p ON pcr.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       SET pcr.administered_by = 'Dr. Cathy Lim'
       WHERE po.id = ? AND pcr.administered_by = 'Dr. Test'`,
      [owner.owner_id]
    );
    await conn.query(
      `UPDATE pet_procedures pp
       JOIN pets p ON pp.pet_id = p.id
       JOIN pet_owners po ON p.pet_owner_id = po.id
       SET pp.veterinarian = 'Dr. Cathy Lim'
       WHERE po.id = ? AND pp.veterinarian = 'Dr. Test'`,
      [owner.owner_id]
    );

    // ======================================================
    // Phase 4 — Payment status for every pet.
    // Owner "Payment Status" / "Payment" reads show "—" when the
    // latest payment subquery runs against an empty payments table.
    // Seed one Paid + Verified payment per pet (skipped if the pet
    // already has any payment row — idempotent).
    // ======================================================
    const PAYMENTS_BY_PET = {
      Choco:   { type_id: 1, or_number: "OR-2026-0903-0001", amount: 250.00, payment_date: "2026-09-03 08:30:00" },
      Max:     { type_id: 2, or_number: "OR-2026-0904-0015", amount: 300.00, payment_date: "2026-09-04 10:15:00" },
      Hachikow:{ type_id: 2, or_number: "OR-2026-0906-0021", amount: 300.00, payment_date: "2026-09-06 13:40:00" },
      Melay:   { type_id: 1, or_number: "OR-2026-0909-0034", amount: 250.00, payment_date: "2026-09-09 09:05:00" },
      Molly:   { type_id: 3, or_number: "OR-2026-0912-0042", amount: 150.00, payment_date: "2026-09-12 15:20:00" },
    };
    for (const [petName, pay] of Object.entries(PAYMENTS_BY_PET)) {
      const pid = petId(petName);
      if (!pid) continue;
      const [[{ payCount }]] = await db.query(
        `SELECT COUNT(*) AS payCount FROM payments WHERE pet_id = ?`,
        [pid]
      );
      if (Number(payCount) > 0) continue;

      await conn.query(
        `INSERT INTO payments
           (pet_owner_id, pet_id, payment_type_id, or_id, or_number, amount,
            payment_date, payment_status, validation_status, rejection_reason,
            reviewed_at, reviewed_by, created_at)
         VALUES (?, ?, ?, NULL, ?, ?, ?, 'Paid', 'Verified', NULL, ?, 210, ?)`,
        [
          owner.owner_id,
          pid,
          pay.type_id,
          pay.or_number,
          pay.amount,
          pay.payment_date,
          pay.payment_date,
          pay.payment_date,
        ]
      );
      console.log(`  seeded payment (${pay.or_number}, ₱${pay.amount.toFixed(2)}) for ${petName}.`);
    }

    // ======================================================
    // Phase 5 — one record request per request type (all Pending).
    // ======================================================
    const REQUEST_SEEDS = [
      { pet: "Choco", type: "Vaccination Card", purpose: "Travel requirement for pet taxi", format: "PDF", comments: "Certified copy of the 5-in-1 vaccination record." },
      { pet: "Max", type: "Record Summary", purpose: "Reference for another clinic", format: "PDF", comments: "Complete summary of consultations and medications." },
      { pet: "Hachikow", type: "Certificate of Registration", purpose: "City pet registration renewal", format: "PDF", comments: "Updated registration certificate with QR details." },
      { pet: "Melay", type: "Health Certificate", purpose: "Pet boarding / daycare requirement", format: "PDF", comments: "Health clearance needed before boarding." },
      { pet: "Molly", type: "Medical Record", purpose: "Complete medical history", format: "PDF", comments: "Full medical history from birth." },
      { pet: "Choco", type: "Prescription Record", purpose: "Copy of active prescriptions", format: "PDF", comments: "List of current medications and dosages." },
      { pet: "Max", type: "Payment Record", purpose: "Proof of payment / OR copy", format: "PDF", comments: "Copy of latest vaccination payment." },
      { pet: "Hachikow", type: "Pet Transfer Certificate", purpose: "Transfer ownership to a new owner", format: "PDF", comments: "Ownership transfer documentation." },
    ];
    for (const seed of REQUEST_SEEDS) {
      const pid = petId(seed.pet);
      if (!pid) continue;
      const [[{ dupReq }]] = await db.query(
        `SELECT COUNT(*) AS dupReq FROM record_requests WHERE pet_id = ? AND request_type = ?`,
        [pid, seed.type]
      );
      if (Number(dupReq) > 0) {
        console.log(`  record request "${seed.type}" (${seed.pet}) already exists, skipped.`);
        continue;
      }
      await conn.query(
        `INSERT INTO record_requests
           (pet_owner_id, pet_id, request_type, purpose, format, comments)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [owner.owner_id, pid, seed.type, seed.purpose, seed.format, seed.comments]
      );
      console.log(`  seeded record request "${seed.type}" for ${seed.pet} (Pending).`);
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  console.log(`Seeded for ${OWNER_NAME}:`);
  console.log(`  consultations: ${cons}`);
  console.log(`  prescriptions: ${rx}`);
  console.log(`  prescription items (medicine records): ${items}`);
  await db.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error("Seeding failed:", err);
  await db.end();
  process.exit(1);
});