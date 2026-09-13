// seedDemoData.js — demo data for the advisor demo.
//
// Run:  npm run demo:seed   (or: node src/utils/seedDemoData.js)
//
// Idempotent: safe to re-run at any point (skips records that already exist).
// Sections (each task adds more):
//   Task 1 — demo accounts (// ========== TASK 1 ==========)
//
// Demo credentials (all use password: Demo1234!)
//   demo.owner1@cityvet.gov.ph  Owner  Ella Villanueva   (San Isidro)
//   demo.owner2@cityvet.gov.ph  Owner  Marco Reyes       (Casile)
//   demo.staff@cityvet.gov.ph  Staff  Rex Abad
//   demo.vet@cityvet.gov.ph   Veterinarian  Dr. Cathy Lim

require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { generateQrForPet } = require("./qrGenerator");
const { generatePaymentQR } = require("./qrHelper");
const { generatePmToken, writeReceiptQrImage } = require("./qrReceipt");
const { generateOutreachQr, generateQrToken } = require("./outreachQrGenerator");

const DEMO_PASSWORD = "Demo1234!";
const YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().slice(0, 10);

function log(message) {
  console.log(message);
}

function isoDaysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------- helpers ----------

async function ensureUser({ email, password, role, fullName }) {
  const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
  if (rows.length) return rows[0].id;
  const hash = await bcrypt.hash(password, 10);
  const [r] = await db.query(
    `INSERT INTO users (email, password, role, status, full_name, created_at)
     VALUES (?, ?, ?, 'active', ?, NOW())`,
    [email, hash, role, fullName]
  );
  log(`  + user ${email} (${role}, ${fullName})`);
  return r.insertId;
}

async function ensurePetOwner(
  userId,
  { fullName, contactNumber, address, barangay, emergencyContactName, emergencyContactNumber }
) {
  const [rows] = await db.query("SELECT id FROM pet_owners WHERE user_id = ?", [userId]);
  if (rows.length) return rows[0].id;
  const [r] = await db.query(
    `INSERT INTO pet_owners
       (user_id, full_name, contact_number, address, barangay,
        emergency_contact_name, emergency_contact_number, is_payment_current, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
    [
      userId,
      fullName,
      contactNumber,
      address,
      barangay,
      emergencyContactName,
      emergencyContactNumber,
    ]
  );
  log(`  + pet_owner ${fullName}`);
  return r.insertId;
}

async function ensureOwnerLocation(ownerId, latitude, longitude, accuracy) {
  const [rows] = await db.query(
    "SELECT id FROM owner_locations WHERE pet_owner_id = ? LIMIT 1",
    [ownerId]
  );
  if (rows.length) return rows[0].id;
  const [r] = await db.query(
    `INSERT INTO owner_locations (pet_owner_id, latitude, longitude, accuracy_meters, status, recorded_at)
     VALUES (?, ?, ?, ?, 'active', NOW())`,
    [ownerId, latitude, longitude, accuracy]
  );
  log(`  + owner_location for owner #${ownerId}`);
  return r.insertId;
}

async function getNextPetCode() {
  const [rows] = await db.query(
    "SELECT pet_code FROM pets WHERE pet_code LIKE ? ORDER BY pet_code DESC LIMIT 1",
    [`PET-${YEAR}-%`]
  );
  const lastSeq = rows.length ? parseInt(rows[0].pet_code.split("-")[2], 10) : 0;
  return `PET-${YEAR}-${String(lastSeq + 1).padStart(6, "0")}`;
}

async function ensurePet(ownerId, data) {
  const [rows] = await db.query(
    "SELECT id FROM pets WHERE pet_owner_id = ? AND LOWER(name) = LOWER(?)",
    [ownerId, data.name]
  );
  if (rows.length) return rows[0].id;

  const petCode = await getNextPetCode();
  const [r] = await db.query(
    `INSERT INTO pets
       (pet_owner_id, pet_code, name, species_id, breed_id, breed_custom,
        sex, color, birthdate, registration_date, status, photo,
        allergies, current_medication, important_conditions, special_instructions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ownerId,
      petCode,
      data.name,
      data.speciesId,
      data.breedId || null,
      data.breedCustom || null,
      data.sex,
      data.color,
      data.birthdate,
      data.registrationDate || isoDaysFromNow(-180),
      data.status || "Verified",
      data.photo || null,
      data.allergies || null,
      data.medication || null,
      data.conditions || null,
      data.instructions || null,
    ]
  );
  const petId = r.insertId;

  // A QR row exists for every pet (generated at registration time).
  const [qrRows] = await db.query("SELECT id FROM qr_codes WHERE pet_id = ?", [petId]);
  if (!qrRows.length) {
    const qr = await generateQrForPet(petId, petCode);
    await db.query(
      `INSERT INTO qr_codes (pet_id, qr_token, image_path, issue_date, status, created_at)
       VALUES (?, ?, ?, NOW(), 'Generated', NOW())`,
      [petId, qr.qrToken, qr.imagePath]
    );
    if (data.status === "Verified") log(`  + pet ${data.name} (${petCode}) with QR`);
    else log(`  + pet ${data.name} (${petCode}, ${data.status})`);
  }

  // Add a vaccination record if requested (id must be explicit).
  if (data.vaccination) {
    const { vaccineId, dateAdministered, nextDueDate, status } = data.vaccination;
    const [existing] = await db.query(
      "SELECT id FROM vaccination_records WHERE pet_id = ? AND vaccine_id = ?",
      [petId, vaccineId]
    );
    if (!existing.length) {
      const [[{ n: maxId }]] = await db.query(
        "SELECT COALESCE(MAX(id), 0) AS n FROM vaccination_records"
      );
      await db.query(
        `INSERT INTO vaccination_records
           (id, pet_id, vaccine_id, date_administered, next_due_date, status,
            administered_by, comments, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          maxId + 1,
          petId,
          vaccineId,
          dateAdministered,
          nextDueDate,
          status,
          null,
          data.vaccination.comments || null,
        ]
      );
    }
  }

  return petId;
}

// =====================================================
// TASK 1 — demo accounts
// =====================================================
async function seedTask1() {
  log("\n========== TASK 1: demo accounts ==========");

  // --- Users ---
  const staffId = await ensureUser({
    email: "demo.staff@cityvet.gov.ph",
    password: DEMO_PASSWORD,
    role: "Staff",
    fullName: "Rex Abad",
  });
  const vetId = await ensureUser({
    email: "demo.vet@cityvet.gov.ph",
    password: DEMO_PASSWORD,
    role: "Veterinarian",
    fullName: "Dr. Cathy Lim",
  });

  // --- Owner 1: Ella Villanueva (San Isidro) ---
  const owner1UserId = await ensureUser({
    email: "demo.owner1@cityvet.gov.ph",
    password: DEMO_PASSWORD,
    role: "Owner",
    fullName: "Ella Villanueva",
  });
  const owner1Id = await ensurePetOwner(owner1UserId, {
    fullName: "Ella Villanueva",
    contactNumber: "09171234568",
    address: "Brgy. San Isidro, Cabuyao, Laguna",
    barangay: "San Isidro",
    emergencyContactName: "Ramon Villanueva",
    emergencyContactNumber: "09182223334",
  });
  await ensureOwnerLocation(owner1Id, 14.2545810, 121.1114620, 12);

  await ensurePet(owner1Id, {
    name: "Snow",
    speciesId: 1,
    breedId: 2,
    sex: "Female",
    color: "White",
    birthdate: "2023-05-10",
    registrationDate: "2023-06-02",
    status: "Verified",
    allergies: "None",
    medication: "None",
    vaccination: {
      vaccineId: 2,
      dateAdministered: "2026-07-15",
      nextDueDate: "2027-07-15",
      status: "Updated",
      comments: "5-in-1 booster",
    },
  });
  await ensurePet(owner1Id, {
    name: "Biskwit",
    speciesId: 1,
    breedId: 1,
    sex: "Male",
    color: "Brown",
    birthdate: "2022-02-20",
    registrationDate: "2022-03-15",
    status: "Verified",
    vaccination: {
      vaccineId: 1,
      dateAdministered: "2025-09-20",
      nextDueDate: isoDaysFromNow(9),
      status: "Due",
      comments: "Anti-rabies due",
    },
  });
  await ensurePet(owner1Id, {
    name: "Minggay",
    speciesId: 2,
    breedId: 4,
    sex: "Female",
    color: "Gray",
    birthdate: "2024-08-05",
    registrationDate: "2024-09-01",
    status: "Verified",
    vaccination: {
      vaccineId: 1,
      dateAdministered: "2024-08-20",
      nextDueDate: "2025-08-20",
      status: "Overdue",
      comments: "Anti-rabies overdue",
    },
  });
  await ensurePet(owner1Id, {
    name: "Toto",
    speciesId: 1,
    breedId: null,
    breedCustom: "Chihuahua Mix",
    sex: "Male",
    color: "Tan",
    birthdate: "2025-11-01",
    registrationDate: isoDaysFromNow(-3),
    status: "Registered",
  });

  // --- Owner 2: Marco Reyes (Casile) ---
  const owner2UserId = await ensureUser({
    email: "demo.owner2@cityvet.gov.ph",
    password: DEMO_PASSWORD,
    role: "Owner",
    fullName: "Marco Reyes",
  });
  const owner2Id = await ensurePetOwner(owner2UserId, {
    fullName: "Marco Reyes",
    contactNumber: "09173334445",
    address: "Brgy. Casile, Cabuyao, Laguna",
    barangay: "Casile",
    emergencyContactName: "Liza Reyes",
    emergencyContactNumber: "09194445556",
  });
  await ensureOwnerLocation(owner2Id, 14.2631120, 121.1398100, 15);

  await ensurePet(owner2Id, {
    name: "Thor",
    speciesId: 1,
    breedId: 3,
    sex: "Male",
    color: "Black",
    birthdate: "2021-11-30",
    registrationDate: "2022-01-10",
    status: "Verified",
    allergies: "None",
    medication: "None",
    vaccination: {
      vaccineId: 1,
      dateAdministered: "2026-09-08",
      nextDueDate: "2027-09-08",
      status: "Updated",
      comments: "Anti-rabies annual",
    },
  });
  await ensurePet(owner2Id, {
    name: "Piper",
    speciesId: 2,
    breedId: 5,
    sex: "Male",
    color: "White",
    birthdate: "2023-01-14",
    registrationDate: "2023-03-20",
    status: "Verified",
    vaccination: {
      vaccineId: 2,
      dateAdministered: "2026-06-11",
      nextDueDate: "2027-06-11",
      status: "Updated",
      comments: "5-in-1 booster",
    },
  });
  await ensurePet(owner2Id, {
    name: "Tuwing",
    speciesId: 1,
    breedId: 1,
    sex: "Female",
    color: "Black and White",
    birthdate: "2024-04-18",
    registrationDate: isoDaysFromNow(-1),
    status: "Registered",
  });

  log(
    `\nDemo accounts ready. Login password for all: ${DEMO_PASSWORD}` +
      `\n  Owner 1 : demo.owner1@cityvet.gov.ph  (${"Ella Villanueva".toUpperCase()})` +
      `\n  Owner 2 : demo.owner2@cityvet.gov.ph  (${"Marco Reyes".toUpperCase()})` +
      `\n  Staff   : demo.staff@cityvet.gov.ph   (${"Rex Abad".toUpperCase()})` +
      `\n  Vet     : demo.vet@cityvet.gov.ph     (${"Dr. Cathy Lim".toUpperCase()})`
  );
  log("TASK 1 done.\n");
}

// =====================================================
// TASK 2 — payment module
// =====================================================
// Rejection happens at the *payment* level (validation_status='Rejected');
// the official_receipt stays 'Pending' so the owner can resubmit it.

async function getPetOwnerByEmail(email) {
  const [rows] = await db.query(
    `SELECT po.id, po.full_name, po.is_payment_current
     FROM pet_owners po
     JOIN users u ON u.id = po.user_id
     WHERE u.email = ?`,
    [email]
  );
  return rows[0] || null;
}

async function getPetId(ownerId, name) {
  const [rows] = await db.query(
    "SELECT id FROM pets WHERE pet_owner_id = ? AND LOWER(name) = LOWER(?)",
    [ownerId, name]
  );
  return rows[0] ? rows[0].id : null;
}

async function getMedicineId(name) {
  const [rows] = await db.query(
    "SELECT id FROM medicines WHERE LOWER(medicine_name) = LOWER(?) LIMIT 1",
    [name]
  );
  return rows.length ? rows[0].id : null;
}

async function ensurePaymentTypes(defs) {
  const map = {};
  let [[{ n: maxId }]] = await db.query(
    "SELECT COALESCE(MAX(id), 0) AS n FROM payment_types"
  );
  for (const d of defs) {
    const [rows] = await db.query("SELECT id FROM payment_types WHERE type_name = ?", [d.type]);
    if (!rows.length) {
      maxId += 1;
      await db.query(
        "INSERT INTO payment_types (id, type_name, default_amount) VALUES (?, ?, ?)",
        [maxId, d.type, d.amount]
      );
      log(`  + payment_type ${d.type} (default ₱${d.amount})`);
      map[d.type] = maxId;
    } else {
      map[d.type] = rows[0].id;
    }
  }
  return map;
}

async function seedPaymentForOr(orId, orNumber, ownerId, petId, paymentTypeId, amount, paymentDate) {
  const [r] = await db.query(
    `INSERT INTO payments (pet_owner_id, pet_id, payment_type_id, or_id, or_number, amount, payment_date, payment_status, validation_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending Verification')`,
    [ownerId, petId, paymentTypeId, orId, orNumber, amount, paymentDate]
  );
  const payId = r.insertId;
  try {
    const qrPath = await generatePaymentQR(payId);
    await db.query("UPDATE payments SET qr_code_path = ? WHERE id = ?", [qrPath, payId]);
  } catch (err) {
    log(`    ! payment QR for #${payId} failed: ${err.message}`);
  }
  return payId;
}

async function ensureOfficialReceipt({ ownerId, staffId, orNumber, paymentDate, items, verified, rejectedReason }) {
  const [dup] = await db.query("SELECT id FROM official_receipts WHERE or_number = ?", [orNumber]);
  if (dup.length) {
    log(`  = OR ${orNumber} already exists, skipping`);
    return dup[0].id;
  }

  const total = items.reduce((sum, it) => sum + it.amount, 0);
  const [orRes] = await db.query(
    `INSERT INTO official_receipts (pet_owner_id, or_number, total_amount, or_photo_path, payment_date, status, created_at)
     VALUES (?, ?, ?, NULL, ?, 'Pending', NOW())`,
    [ownerId, orNumber, total, paymentDate]
  );
  const orId = orRes.insertId;
  log(`  + official_receipt ${orNumber} (₱${total.toFixed(2)})`);

  let hasRejected = false;
  for (const it of items) {
    const payId = await seedPaymentForOr(
      orId, orNumber, ownerId, it.petId, it.paymentTypeId, it.amount, paymentDate
    );
    if (verified) {
      await db.query(
        `UPDATE payments SET payment_status = 'Paid', validation_status = 'Verified',
             reviewed_at = ?, reviewed_by = ? WHERE id = ?`,
        [nowSql(), staffId, payId]
      );
    }
    if (it.reject) {
      hasRejected = true;
      await db.query(
        `UPDATE payments SET validation_status = 'Rejected', rejection_reason = ?,
             reviewed_at = ?, reviewed_by = ? WHERE id = ?`,
        [rejectedReason || it.reject, nowSql(), staffId, payId]
      );
    }
  }

  if (verified) {
    await db.query("UPDATE official_receipts SET status = 'Verified' WHERE id = ?", [orId]);
    await db.query("UPDATE pet_owners SET is_payment_current = TRUE WHERE id = ?", [ownerId]);
    log(`  . OR ${orNumber} -> Verified`);
  } else if (hasRejected) {
    log(`  . OR ${orNumber} -> Pending (has rejected payment → resubmit demo)`);
  }
  return orId;
}

function nowSql() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

async function ensurePmRecord({ staffId, ownerId, orNumber, orAmount, orDate, paymentType, description, medicineId, medicineQuantity, medicineTotal }) {
  const [dup] = await db.query("SELECT id FROM payment_monitoring WHERE or_number = ?", [orNumber]);
  if (dup.length) {
    log(`  = pm ${orNumber} already exists, skipping`);
    return dup[0].id;
  }
  const pmToken = generatePmToken();
  const [r] = await db.query(
    `INSERT INTO payment_monitoring
       (or_number, or_amount, or_date, or_time, or_description, payment_items, or_photo_path,
        ocr_text, ocr_confidence, pet_owner_id, payment_type, medicine_id,
        medicine_quantity, medicine_total, recorded_by, remarks, pm_token, created_at)
     VALUES (?, ?, ?, '09:00:00', ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, NULL, ?, NOW())`,
    [
      orNumber,
      orAmount,
      orDate,
      description,
      ownerId,
      paymentType,
      medicineId || null,
      medicineQuantity || null,
      medicineTotal || null,
      staffId,
      pmToken,
    ]
  );
  const id = r.insertId;
  try {
    const receiptQrPath = await writeReceiptQrImage(pmToken);
    await db.query("UPDATE payment_monitoring SET receipt_qr_path = ? WHERE id = ?", [receiptQrPath, id]);
    log(`  + payment_monitoring ${orNumber} (with receipt QR)`);
  } catch (err) {
    log(`  + payment_monitoring ${orNumber} (QR failed: ${err.message})`);
  }
  return id;
}

async function seedTask2() {
  log("\n========== TASK 2: payment module ==========");

  const payTypes = await ensurePaymentTypes([
    { type: "Consultation", amount: 250 },
    { type: "Vaccination", amount: 300 },
    { type: "Medicine", amount: 150 },
  ]);

  const [[staffRow]] = await db.query(
    "SELECT id FROM users WHERE email = ?",
    ["demo.staff@cityvet.gov.ph"]
  );
  const staffId = staffRow.id;

  const o1 = await getPetOwnerByEmail("demo.owner1@cityvet.gov.ph");
  const o2 = await getPetOwnerByEmail("demo.owner2@cityvet.gov.ph");

  const snow = await getPetId(o1.id, "Snow");
  const biskwit = await getPetId(o1.id, "Biskwit");
  const minggay = await getPetId(o1.id, "Minggay");
  const thor = await getPetId(o2.id, "Thor");
  const piper = await getPetId(o2.id, "Piper");

  // Official receipts + payments (owner-submitted payment flow)
  await ensureOfficialReceipt({
    ownerId: o1.id, staffId,
    orNumber: "OR-2026-05101",
    paymentDate: isoDaysFromNow(-4),
    items: [
      { petId: snow, paymentTypeId: payTypes.Consultation, amount: 250 },
      { petId: snow, paymentTypeId: payTypes.Medicine, amount: 150 },
    ],
  });
  await ensureOfficialReceipt({
    ownerId: o1.id, staffId,
    orNumber: "OR-2026-05102",
    paymentDate: isoDaysFromNow(-6),
    items: [
      { petId: minggay, paymentTypeId: payTypes.Consultation, amount: 250, reject: true },
    ],
    rejectedReason: "OR photo is unclear. Please upload a clearer receipt photo.",
  });
  await ensureOfficialReceipt({
    ownerId: o1.id, staffId,
    orNumber: "OR-2026-05103",
    paymentDate: isoDaysFromNow(-12),
    verified: true,
    items: [
      { petId: biskwit, paymentTypeId: payTypes.Vaccination, amount: 300 },
    ],
  });
  await ensureOfficialReceipt({
    ownerId: o2.id, staffId,
    orNumber: "OR-2026-05104",
    paymentDate: isoDaysFromNow(-2),
    items: [
      { petId: thor, paymentTypeId: payTypes.Vaccination, amount: 300 },
      { petId: piper, paymentTypeId: payTypes.Medicine, amount: 150 },
    ],
  });
  await ensureOfficialReceipt({
    ownerId: o2.id, staffId,
    orNumber: "OR-2026-05105",
    paymentDate: isoDaysFromNow(-20),
    verified: true,
    items: [
      { petId: thor, paymentTypeId: payTypes.Consultation, amount: 250 },
    ],
  });

  // Clinic charges recorded by staff (appears in the owner payment history)
  const pyran = await getMedicineId("Pyrantel Pamoate");
  await ensurePmRecord({
    staffId, ownerId: o1.id,
    orNumber: "RCPT-2026-007411", orAmount: 300, orDate: isoDaysFromNow(-3),
    paymentType: "Vaccination", description: "Anti-Rabies Vaccination",
  });
  await ensurePmRecord({
    staffId, ownerId: o1.id,
    orNumber: "RCPT-2026-007642", orAmount: 150, orDate: isoDaysFromNow(-10),
    paymentType: "Medicine", description: "Deworming",
    medicineId: pyran, medicineQuantity: "1", medicineTotal: 150,
  });
  await ensurePmRecord({
    staffId, ownerId: o1.id,
    orNumber: "RCPT-2026-007833", orAmount: 250, orDate: isoDaysFromNow(-25),
    paymentType: "Consultation", description: "Consultation + follow-up",
  });
  await ensurePmRecord({
    staffId, ownerId: o2.id,
    orNumber: "RCPT-2026-007910", orAmount: 250, orDate: isoDaysFromNow(-6),
    paymentType: "Consultation", description: "Full checkup",
  });
  await ensurePmRecord({
    staffId, ownerId: o2.id,
    orNumber: "RCPT-2026-008021", orAmount: 300, orDate: isoDaysFromNow(-2),
    paymentType: "Vaccination", description: "5-in-1 Booster",
  });

  log("TASK 2 done.\n");
}

// =====================================================
// TASK 3 — clinical module
// =====================================================

async function ensureConsultation({ ownerId, petName, diagnosis, treatmentPlan, cDate, followUp, vetId }) {
  const petId = await getPetId(ownerId, petName);
  if (!petId) {
    log(`  ! pet "${petName}" not found, skipping consult`);
    return null;
  }
  const [dup] = await db.query(
    "SELECT id FROM consultation_records WHERE pet_id = ? AND consultation_date = ?",
    [petId, cDate]
  );
  if (dup.length) {
    log(`  = consult ${petName} @ ${cDate} already exists`);
    return dup[0].id;
  }
  const [r] = await db.query(
    `INSERT INTO consultation_records (pet_id, diagnosis, treatment_plan, consultation_date, follow_up_date, vet_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [petId, diagnosis, treatmentPlan, cDate, followUp, vetId]
  );
  log(`  + consultation #${r.insertId}: ${petName} (${cDate})`);
  return r.insertId;
}

async function ensurePrescription({ consultationId, items }) {
  if (!consultationId) return;
  const [dup] = await db.query("SELECT id FROM prescriptions WHERE consultation_id = ?", [consultationId]);
  if (dup.length) {
    log(`  = prescription already exists for consult #${consultationId}`);
    return dup[0].id;
  }
  const [r] = await db.query(
    "INSERT INTO prescriptions (consultation_id, prescribed_date) VALUES (?, CURDATE())",
    [consultationId]
  );
  const rxId = r.insertId;
  for (const m of items) {
    const [med] = await db.query("SELECT id FROM medicines WHERE LOWER(medicine_name) = LOWER(?)", [m.medicine]);
    if (!med.length) {
      log(`    ! medicine "${m.medicine}" not found in catalog`);
      continue;
    }
    await db.query(
      `INSERT INTO prescription_items (prescription_id, medicine_id, quantity, dosage, frequency, duration, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [rxId, med[0].id, m.quantity, m.dosage, m.frequency, m.duration, m.instructions]
    );
    log(`    . rx #${rxId}: ${m.medicine} (${m.dosage})`);
  }
  return rxId;
}

async function ensurePreventiveCare({ ownerId, petName, careType, productName, dateAdministered, nextDueDate, administeredBy, notes }) {
  const petId = await getPetId(ownerId, petName);
  if (!petId) return;
  const [dup] = await db.query(
    "SELECT id FROM preventive_care_records WHERE pet_id = ? AND care_type = ? AND date_administered = ?",
    [petId, careType, dateAdministered]
  );
  if (dup.length) {
    log(`  = preventive ${petName} ${careType} already exists`);
    return dup[0].id;
  }
  await db.query(
    `INSERT INTO preventive_care_records (pet_id, care_type, product_name, date_administered, next_due_date, administered_by, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [petId, careType, productName, dateAdministered, nextDueDate, administeredBy, notes || null]
  );
  log(`  + preventive ${petName}: ${careType} (${productName})`);
}

async function ensureProcedure({ ownerId, petName, procedureType, procedureName, procedureDate, veterinarian, resultNotes }) {
  const petId = await getPetId(ownerId, petName);
  if (!petId) return;
  const [dup] = await db.query(
    "SELECT id FROM pet_procedures WHERE pet_id = ? AND procedure_type = ? AND procedure_date = ?",
    [petId, procedureType, procedureDate]
  );
  if (dup.length) {
    log(`  = procedure ${petName} ${procedureType} already exists`);
    return dup[0].id;
  }
  await db.query(
    `INSERT INTO pet_procedures (pet_id, procedure_type, procedure_name, procedure_date, veterinarian, result_notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [petId, procedureType, procedureName, procedureDate, veterinarian, resultNotes || null]
  );
  log(`  + procedure ${petName}: ${procedureName} (${procedureDate})`);
}

async function seedTask3() {
  log("\n========== TASK 3: clinical module ==========");

  const [[vetRow]] = await db.query("SELECT id FROM users WHERE email = ?", ["demo.vet@cityvet.gov.ph"]);
  const vetId = vetRow.id;
  const vetName = "Dr. Cathy Lim";

  const o1 = await getPetOwnerByEmail("demo.owner1@cityvet.gov.ph");
  const o2 = await getPetOwnerByEmail("demo.owner2@cityvet.gov.ph");

  // --- Owner 1: Snow ---
  let c = await ensureConsultation({
    ownerId: o1.id, petName: "Snow",
    diagnosis: "Mild allergic dermatitis with facial pruritus",
    treatmentPlan: "Antihistamine + topical antihistamine; monitor for rebound itching; avoid known triggers.",
    cDate: "2026-08-02", followUp: "2026-08-16", vetId,
  });
  await ensurePrescription({ consultationId: c, items: [
    { medicine: "Chlorpheniramine", quantity: "10 tablets", dosage: "1 tablet (2 mg)", frequency: "2x daily", duration: "5 days", instructions: "Give after meals." },
    { medicine: "Frontline Spray", quantity: "1 bottle (250 mL)", dosage: "Apply along the backline", frequency: "1x monthly", duration: "Ongoing", instructions: "Do not bathe pet for 48h after application." },
  ]});

  c = await ensureConsultation({
    ownerId: o1.id, petName: "Snow",
    diagnosis: "Routine wellness — 5-in-1 booster vaccination",
    treatmentPlan: "Administered 5-in-1 vaccine; next dose due 2027-07-15.",
    cDate: "2026-07-15", followUp: "2027-07-15", vetId,
  });
  await ensurePreventiveCare({
    ownerId: o1.id, petName: "Snow", careType: "Heartworm Preventive", productName: "Advocate spot-on",
    dateAdministered: "2026-08-15", nextDueDate: "2026-11-15", administeredBy: vetName, notes: "Spot-on application.",
  });
  await ensureProcedure({
    ownerId: o1.id, petName: "Snow", procedureType: "Dental", procedureName: "Dental prophylaxis",
    procedureDate: "2026-08-15", veterinarian: vetName, resultNotes: "Mild tartar removed; grade 1 gingivitis.",
  });

  // --- Owner 1: Biskwit ---
  c = await ensureConsultation({
    ownerId: o1.id, petName: "Biskwit",
    diagnosis: "Healthy adult — annual physical exam",
    treatmentPlan: "Stool exam requested; schedule anti-rabies booster before 2026-09-20.",
    cDate: "2026-09-10", followUp: "2026-09-20", vetId,
  });
  await ensurePrescription({ consultationId: c, items: [
    { medicine: "Vitamin B Complex", quantity: "15 tablets", dosage: "1 tablet", frequency: "1x daily", duration: "15 days", instructions: "Appetite and energy support." },
  ]});
  await ensurePreventiveCare({
    ownerId: o1.id, petName: "Biskwit", careType: "Deworming", productName: "Pyrantel Pamoate",
    dateAdministered: "2026-09-10", nextDueDate: "2026-12-10", administeredBy: vetName, notes: "",
  });
  await ensureProcedure({
    ownerId: o1.id, petName: "Biskwit", procedureType: "Laboratory", procedureName: "Fecalysis",
    procedureDate: "2026-09-10", veterinarian: vetName, resultNotes: "Negative for intestinal parasites.",
  });

  // --- Owner 1: Minggay ---
  c = await ensureConsultation({
    ownerId: o1.id, petName: "Minggay",
    diagnosis: "Feline skin infection (bacterial) with odor",
    treatmentPlan: "Antibiotic + antiprotozoal; clean affected area 2x/day.",
    cDate: "2025-08-10", followUp: "2025-08-24", vetId,
  });
  await ensurePrescription({ consultationId: c, items: [
    { medicine: "Metronidazole", quantity: "10 tablets", dosage: "1 tablet (250 mg)", frequency: "2x daily", duration: "5 days", instructions: "With food." },
    { medicine: "Enrofloxacin (Baytril)", quantity: "1 bottle (10 mL)", dosage: "0.5 mL / 5 kg", frequency: "1x daily", duration: "7 days", instructions: "Shake well before use." },
  ]});

  c = await ensureConsultation({
    ownerId: o1.id, petName: "Minggay",
    diagnosis: "Ear mite infestation (Otodectes cynotis)",
    treatmentPlan: "Topical ear treatment; recheck in 10 days.",
    cDate: "2026-08-28", followUp: "2026-09-11", vetId,
  });
  await ensurePrescription({ consultationId: c, items: [
    { medicine: "Ivermectin", quantity: "1 bottle (10 mL)", dosage: "2 drops per ear", frequency: "1x daily", duration: "10 days", instructions: "Warm solution to body temperature before use." },
  ]});
  await ensurePreventiveCare({
    ownerId: o1.id, petName: "Minggay", careType: "Flea / Tick Preventive", productName: "Frontline Spray",
    dateAdministered: "2026-08-28", nextDueDate: "2026-11-28", administeredBy: vetName, notes: "Applied topically.",
  });

  // --- Owner 2: Thor ---
  c = await ensureConsultation({
    ownerId: o2.id, petName: "Thor",
    diagnosis: "Healthy — annual wellness exam",
    treatmentPlan: "Deworming given; schedule anti-rabies booster by 2027-09-08.",
    cDate: "2026-07-05", followUp: "2026-09-30", vetId,
  });
  await ensurePrescription({ consultationId: c, items: [
    { medicine: "Pyrantel Pamoate", quantity: "2 tablets", dosage: "11.4 mg / lb", frequency: "2 doses", duration: "14 days apart", instructions: "Repeat in 14 days." },
  ]});
  await ensurePreventiveCare({
    ownerId: o2.id, petName: "Thor", careType: "Deworming", productName: "Pyrantel Pamoate",
    dateAdministered: "2026-07-05", nextDueDate: "2026-10-05", administeredBy: vetName, notes: "Routine deworming.",
  });
  await ensureProcedure({
    ownerId: o2.id, petName: "Thor", procedureType: "Laboratory", procedureName: "CBC + blood smear",
    procedureDate: "2026-07-05", veterinarian: vetName, resultNotes: "Within normal limits.",
  });

  // --- Owner 2: Piper ---
  c = await ensureConsultation({
    ownerId: o2.id, petName: "Piper",
    diagnosis: "Otitis externa, left ear with mild head tilt",
    treatmentPlan: "Ear cleaning + anti-inflammatory; follow-up if worsening.",
    cDate: "2026-05-20", followUp: "2026-06-03", vetId,
  });
  await ensurePrescription({ consultationId: c, items: [
    { medicine: "Carprofen", quantity: "3 tablets", dosage: "1 tablet (25 mg)", frequency: "1x / 12 hours", duration: "3 days", instructions: "With food to avoid GI upset." },
  ]});
  await ensurePreventiveCare({
    ownerId: o2.id, petName: "Piper", careType: "Flea / Tick Preventive", productName: "Frontline Spray",
    dateAdministered: "2026-06-11", nextDueDate: "2026-09-11", administeredBy: vetName, notes: "",
  });
  await ensureProcedure({
    ownerId: o2.id, petName: "Piper", procedureType: "Grooming", procedureName: "Full grooming + ear hair pluck",
    procedureDate: "2026-05-20", veterinarian: vetName, resultNotes: "Both ears cleaned; no debris.",
  });

  log("TASK 3 done.\n");
}

// =====================================================
// TASK 4 — community module (outreach, requests, announcements, drafts)
// =====================================================

async function ensureProgramName(id, name) {
  const [[p]] = await db.query("SELECT id, program_name FROM outreach_programs WHERE id = ?", [id]);
  if (!p) {
    log(`  ! outreach program #${id} not found`);
    return;
  }
  if (p.program_name !== name) {
    await db.query("UPDATE outreach_programs SET program_name = ? WHERE id = ?", [name, id]);
    log(`  ~ renamed program #${id} -> "${name}"`);
  }
}

async function ensureProgramStatus(id, status, eventDate, endDate) {
  const [[p]] = await db.query("SELECT id, status FROM outreach_programs WHERE id = ?", [id]);
  if (!p) return;
  if (p.status !== status) {
    await db.query(
      "UPDATE outreach_programs SET status = ?, event_date = ?, end_date = ? WHERE id = ?",
      [status, eventDate, endDate, id]
    );
    log(`  ~ program #${id} -> status ${status}, event ${eventDate}`);
  }
}

async function ensureService(outreachId, serviceName, amount) {
  const [rows] = await db.query(
    "SELECT id FROM outreach_program_services WHERE outreach_id = ? AND LOWER(service_name) = LOWER(?)",
    [outreachId, serviceName]
  );
  if (!rows.length) {
    await db.query(
      "INSERT INTO outreach_program_services (outreach_id, service_name, amount) VALUES (?, ?, ?)",
      [outreachId, serviceName, amount]
    );
    log(`  + service "${serviceName}" (₱${amount}) on program #${outreachId}`);
  }
}

async function upsertOutreachTransaction({ outreachId, ownerName, petName, ownerId, petId, barangay, serviceDate, serviceTime, items, status, submittedAt, verifiedAt, rejectionReason, staffId }) {
  const [dup] = await db.query(
    "SELECT id FROM outreach_transactions WHERE outreach_id = ? AND owner_name = ? AND pet_name = ?",
    [outreachId, ownerName, petName]
  );
  if (dup.length) {
    log(`  = outreach tx ${ownerName}/${petName} already exists, skipping`);
    return dup[0].id;
  }

  const total = items.reduce((s, it) => s + it.amount, 0);
  const qrToken = generateQrToken();
  const { imagePath } = await generateOutreachQr(qrToken);

  const toSql = (d) => (d ? new Date(d).toISOString().slice(0, 19).replace("T", " ") : null);

  const [r] = await db.query(
    `INSERT INTO outreach_transactions
       (outreach_id, qr_token, qr_image_path, pet_owner_id, pet_id, owner_name, owner_contact, pet_name,
        barangay, service_date, service_time, total_amount, status, submitted_at, verified_at, verified_by, rejection_reason)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      outreachId,
      qrToken,
      imagePath,
      ownerId,
      petId,
      ownerName,
      petName,
      barangay,
      serviceDate,
      serviceTime,
      total,
      status,
      toSql(submittedAt),
      toSql(verifiedAt),
      status === "Verified" ? staffId : null,
      rejectionReason || null,
    ]
  );

  for (const it of items) {
    await db.query(
      "INSERT INTO outreach_transaction_items (transaction_id, service_name, amount) VALUES (?, ?, ?)",
      [r.insertId, it.name, it.amount]
    );
  }
  log(`  + outreach tx #${r.insertId}: ${ownerName}/${petName} (${status}) ₱${total}`);
  return r.insertId;
}

async function ensureRecordRequest({ ownerId, petId, requestType, purpose, format, comments, status, requestedDate, issuedDate }) {
  const [dup] = await db.query(
    "SELECT id FROM record_requests WHERE pet_owner_id = ? AND pet_id = ? AND request_type = ?",
    [ownerId, petId, requestType]
  );
  if (dup.length) {
    log(`  = record request "${requestType}" already exists, skipping`);
    return dup[0].id;
  }
  const toSql = (d) => (d ? new Date(d).toISOString().slice(0, 19).replace("T", " ") : null);
  const [r] = await db.query(
    `INSERT INTO record_requests (pet_owner_id, pet_id, request_type, purpose, format, comments, status, requested_date, issued_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ownerId, petId, requestType, purpose, format, comments, status, toSql(requestedDate), toSql(issuedDate)]
  );
  log(`  + record request #${r.insertId}: ${requestType} (${status})`);
  return r.insertId;
}

async function ensureAnnouncement({ title, message, audience, scheduledAt, sentAt, createdBy }) {
  const [dup] = await db.query("SELECT id FROM announcements WHERE title = ?", [title]);
  if (dup.length) {
    log(`  = announcement "${title}" already exists, skipping`);
    return dup[0].id;
  }
  const toSql = (d) => (d ? new Date(d).toISOString().slice(0, 19).replace("T", " ") : null);
  await db.query(
    `INSERT INTO announcements (title, message, audience, scheduled_at, is_sent, sent_at, created_by)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
    [title, message, audience, toSql(scheduledAt), toSql(sentAt), createdBy]
  );
  log(`  + announcement "${title}" (audience: ${audience})`);
}

async function ensureDraft({ ownerId, petName, payload, deviceId, syncState }) {
  const key = `"name":"${petName}"`;
  const [dup] = await db.query(
    "SELECT id FROM draft_registrations WHERE pet_owner_id = ? AND payload LIKE ?",
    [ownerId, `%${key}%`]
  );
  if (dup.length) {
    log(`  = draft "${petName}" already exists, skipping`);
    return dup[0].id;
  }
  await db.query(
    `INSERT INTO draft_registrations (pet_owner_id, temp_reg_info, device_id, payload, sync_state, sync_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      ownerId,
      JSON.stringify(payload),
      deviceId,
      JSON.stringify(payload),
      syncState,
      syncState === "Pending Sync" ? nowSql() : null,
    ]
  );
  log(`  + draft "${petName}" (${syncState})`);
}

async function seedTask4() {
  log("\n========== TASK 4: community module ==========");

  // -- 1) Outreach program cleanup ---------------------------------
  await ensureProgramName(4, "Free Vaccination & Deworming Drive");
  await ensureProgramName(5, "Free Anti-Rabies Vaccination Drive");
  await ensureProgramStatus(5, "Ongoing", "2026-09-19", "2026-09-19");

  await ensureService(4, "Anti-Rabies Vaccination (Free)", 0);
  await ensureService(4, "Deworming (Free)", 0);
  await ensureService(5, "Anti-Rabies Vaccination (Free)", 0);

  // -- 2) Outreach transactions with a mix of statuses --------------
  const [[staff]] = await db.query("SELECT id FROM users WHERE email = ?", ["demo.staff@cityvet.gov.ph"]);
  const staffId = staff.id;
  const o1 = await getPetOwnerByEmail("demo.owner1@cityvet.gov.ph");
  const o2 = await getPetOwnerByEmail("demo.owner2@cityvet.gov.ph");
  const snow = await getPetId(o1.id, "Snow");
  const biskwit = await getPetId(o1.id, "Biskwit");
  const minggay = await getPetId(o1.id, "Minggay");
  const thor = await getPetId(o2.id, "Thor");
  const piper = await getPetId(o2.id, "Piper");

  await upsertOutreachTransaction({
    outreachId: 4, ownerName: o1.full_name, petName: "Snow",
    ownerId: o1.id, petId: snow,
    barangay: "San Isidro", serviceDate: "2026-09-09", serviceTime: "09:30:00",
    items: [{ name: "Registration Fee", amount: 50 }],
    status: "Verified",
    submittedAt: "2026-09-09T09:30:00", verifiedAt: "2026-09-09T10:05:00",
    staffId,
  });
  await upsertOutreachTransaction({
    outreachId: 4, ownerName: o1.full_name, petName: "Biskwit",
    ownerId: o1.id, petId: biskwit,
    barangay: "San Isidro", serviceDate: "2026-09-09", serviceTime: "10:20:00",
    items: [{ name: "Registration Fee", amount: 50 }, { name: "Deworming (Free)", amount: 0 }],
    status: "Verified",
    submittedAt: "2026-09-09T10:20:00", verifiedAt: "2026-09-09T10:55:00",
    staffId,
  });
  await upsertOutreachTransaction({
    outreachId: 5, ownerName: o2.full_name, petName: "Thor",
    ownerId: o2.id, petId: thor,
    barangay: "Casile", serviceDate: "2026-09-19", serviceTime: "08:30:00",
    items: [{ name: "REGISTRATION FEE", amount: 50 }],
    status: "Submitted",
    submittedAt: "2026-09-11T08:10:00",
    staffId,
  });
  await upsertOutreachTransaction({
    outreachId: 5, ownerName: o2.full_name, petName: "Piper",
    ownerId: o2.id, petId: piper,
    barangay: "Casile", serviceDate: "2026-09-19", serviceTime: "09:00:00",
    items: [{ name: "REGISTRATION FEE", amount: 50 }],
    status: "Pending",
    staffId,
  });
  await upsertOutreachTransaction({
    outreachId: 5, ownerName: o1.full_name, petName: "Minggay",
    ownerId: o1.id, petId: minggay,
    barangay: "Casile", serviceDate: "2026-09-19", serviceTime: "08:45:00",
    items: [{ name: "REGISTRATION FEE", amount: 50 }],
    status: "Rejected",
    submittedAt: "2026-09-10T14:00:00",
    rejectionReason: "Owner opted out after pre-registration; slot released.",
    staffId,
  });

  // -- 3) Record requests -------------------------------------------
  await ensureRecordRequest({
    ownerId: o1.id, petId: snow,
    requestType: "Vaccination Certificate", purpose: "Travel requirement for pet taxi",
    format: "Printed", comments: "Need a certified copy of Snow's 5-in-1 vaccination record.",
    status: "Open", requestedDate: new Date(Date.now() - 2 * 864e5),
  });
  await ensureRecordRequest({
    ownerId: o2.id, petId: thor,
    requestType: "Medical Records", purpose: "For local dog show registration",
    format: "PDF", comments: "Requesting Thor's complete medical history from the last year.",
    status: "Open", requestedDate: new Date(Date.now() - 864e5),
  });
  await ensureRecordRequest({
    ownerId: o1.id, petId: minggay,
    requestType: "Vaccination Certificate", purpose: "City pet registration renewal",
    format: "PDF", comments: "",
    status: "Issued",
    requestedDate: new Date(Date.now() - 12 * 864e5),
    issuedDate: new Date(Date.now() - 5 * 864e5),
  });

  // -- 4) Announcements ----------------------------------------------
  await ensureAnnouncement({
    title: "Staff Bulletin: Outreach Duty Roster",
    message: "Kindly check the updated duty roster for the Free Anti-Rabies Vaccination Drive on September 19 at Casile. Assignments are posted at the office and on the dashboard. Please coordinate with the barangay volunteers.",
    audience: "Staff", scheduledAt: new Date(Date.now() - 36e5), sentAt: new Date(Date.now() - 36e5), createdBy: staffId,
  });
  await ensureAnnouncement({
    title: "Reminder: Renew Your Pet's Annual Registration",
    message: "Good day! Please update your pet's registration record with the City Veterinary Office. Keeping ownership details current helps us reach you quickly in emergencies. Visit your account to check your pet's records.",
    audience: "Owner", scheduledAt: new Date(Date.now() - 2 * 864e5), sentAt: new Date(Date.now() - 2 * 864e5), createdBy: staffId,
  });

  // -- 5) Draft registrations ----------------------------------------
  await ensureDraft({
    ownerId: o2.id, petName: "Ginger",
    payload: { name: "Ginger", species_id: 1, breed_id: 1, sex: "Female", color: "Golden", birthdate: "2024-06-15", additional_notes: "Waiting for photo upload" },
    deviceId: "demo-laptop-1", syncState: "Pending Sync",
  });
  await ensureDraft({
    ownerId: o2.id, petName: "Mochi",
    payload: { name: "Mochi", species_id: 2, breed_id: 4, sex: "Male", color: "Gray", birthdate: "2025-01-20" },
    deviceId: "demo-laptop-2", syncState: "Draft",
  });
  await ensureDraft({
    ownerId: o1.id, petName: "Choco",
    payload: { name: "Choco", species_id: 1, breed_id: 2, sex: "Male", color: "Brown", birthdate: "2023-11-02", additional_notes: "Imported from mobile" },
    deviceId: "demo-mobile-1", syncState: "Pending Sync",
  });

  log("TASK 4 done.\n");
}

(async () => {
  try {
    await seedTask1();
    await seedTask2();
    await seedTask3();
    await seedTask4();
    await db.end();
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
})();