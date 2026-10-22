require("dotenv").config();

const db = require("../config/db");
const {
  EMAIL_PREFIX,
  MARKER,
  PET_CODE_PREFIX,
  createAnalyticsSeed2025,
} = require("./analyticsSeed2025Data");

function timestamp(date) {
  return `${date} 09:00:00`;
}

async function getOwnerId(owner) {
  const email = `${EMAIL_PREFIX}${String(owner.number).padStart(4, "0")}@cityvet.invalid`;
  const [users] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
  let userId = users[0]?.id;

  if (!userId) {
    const [result] = await db.query(
      `INSERT INTO users (email, role, status, full_name, created_at)
       VALUES (?, 'Owner', 'inactive', ?, ?)`,
      [email, `Analytics Seed Owner 2025 #${String(owner.number).padStart(2, "0")}`, timestamp(owner.createdAt)]
    );
    userId = result.insertId;
  }

  const [owners] = await db.query("SELECT id FROM pet_owners WHERE user_id = ?", [userId]);
  if (owners.length) return owners[0].id;

  const [result] = await db.query(
    `INSERT INTO pet_owners
       (user_id, full_name, contact_number, address, barangay, is_payment_current, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [
      userId,
      `Analytics Seed Owner 2025 #${String(owner.number).padStart(2, "0")}`,
      `09${String(owner.number).padStart(9, "0")}`,
      "Synthetic analytics data",
      "Baclaran",
      timestamp(owner.createdAt),
    ]
  );
  return result.insertId;
}

async function getPetId(pet, ownerId, speciesId) {
  const petCode = `${PET_CODE_PREFIX}${String(pet.number).padStart(4, "0")}`;
  const [existing] = await db.query("SELECT id FROM pets WHERE pet_code = ?", [petCode]);
  if (existing.length) return existing[0].id;

  const [result] = await db.query(
    `INSERT INTO pets
       (pet_owner_id, pet_code, name, species_id, breed_custom, sex, color,
        birthdate, registration_date, status, created_at)
     VALUES (?, ?, ?, ?, 'Mixed Breed', ?, ?, ?, ?, 'Verified', ?)`,
    [
      ownerId,
      petCode,
      `Analytics Seed Pet 2025 #${String(pet.number).padStart(2, "0")}`,
      speciesId,
      pet.number % 2 ? "Female" : "Male",
      pet.speciesName === "Dog" ? "Brown" : "Gray",
      `${2018 + (pet.number % 7)}-01-01`,
      pet.registrationDate,
      timestamp(pet.registrationDate),
    ]
  );
  return result.insertId;
}

async function ensureQrCode(pet, petId) {
  const [existing] = await db.query("SELECT id FROM qr_codes WHERE pet_id = ?", [petId]);
  if (existing.length) return;

  const token = `${PET_CODE_PREFIX}QR-${String(pet.number).padStart(4, "0")}`;
  await db.query(
    `INSERT INTO qr_codes (pet_id, qr_token, image_path, issue_date, status, created_at)
     VALUES (?, ?, NULL, ?, 'Generated', ?)`,
    [petId, token, timestamp(pet.registrationDate), timestamp(pet.registrationDate)]
  );
}

async function ensureVaccination(vaccination, petId, vaccineId, nextId) {
  const comment = `${MARKER}:${vaccination.key}`;
  const [existing] = await db.query(
    "SELECT id FROM vaccination_records WHERE comments = ?",
    [comment]
  );
  if (existing.length) return nextId;

  await db.query(
    `INSERT INTO vaccination_records
       (id, pet_id, vaccine_id, dose_label, date_administered, next_due_date,
        status, comments, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'Updated', ?, ?)`,
    [
      nextId,
      petId,
      vaccineId,
      vaccination.doseLabel,
      vaccination.dateAdministered,
      vaccination.nextDueDate,
      comment,
      timestamp(vaccination.dateAdministered),
    ]
  );
  return nextId + 1;
}

async function ensurePayment(payment, ownerId, petId) {
  const ref = `${PET_CODE_PREFIX}PAY-${String(payment.number).padStart(4, "0")}`;
  const [existing] = await db.query(
    "SELECT id FROM payment_monitoring WHERE payment_reference = ?",
    [ref]
  );
  if (existing.length) return;

  await db.query(
    `INSERT INTO payment_monitoring
       (or_number, or_amount, or_date, or_time, or_description, pet_owner_id, pet_id,
        payment_type, payment_reference, payment_status, total_amount, consultation_date, created_at)
     VALUES (?, ?, ?, '09:00:00', ?, ?, ?, ?, ?, 'Paid', ?, ?, ?)`,
    [
      ref,
      payment.amount,
      payment.serviceDate,
      `${MARKER} synthetic ${payment.paymentType.toLowerCase()} payment`,
      ownerId,
      petId,
      payment.paymentType,
      ref,
      payment.amount,
      payment.serviceDate,
      timestamp(payment.serviceDate),
    ]
  );
}

async function applySeed() {
  const seed = createAnalyticsSeed2025();
  const [speciesRows] = await db.query(
    "SELECT id, species_name FROM species WHERE LOWER(species_name) IN ('dog', 'cat')"
  );
  const speciesIds = new Map(speciesRows.map((row) => [String(row.species_name).toLowerCase(), row.id]));
  if (!speciesIds.has("dog") || !speciesIds.has("cat")) {
    throw new Error("Both Dog and Cat species must exist before seeding analytics data.");
  }

  const [vaccineRows] = await db.query(
    "SELECT id, species_id FROM vaccines ORDER BY id"
  );
  const vaccinesBySpecies = new Map();
  for (const speciesId of speciesIds.values()) {
    vaccinesBySpecies.set(
      String(speciesId),
      vaccineRows.filter((vaccine) => vaccine.species_id === null || Number(vaccine.species_id) === Number(speciesId))
    );
  }
  if ([...vaccinesBySpecies.values()].some((vaccines) => vaccines.length === 0)) {
    throw new Error("At least one vaccine applicable to both Dog and Cat must exist before seeding.");
  }

  const ownerIds = new Map();
  for (const owner of seed.owners) {
    ownerIds.set(owner.key, await getOwnerId(owner));
  }

  const petIds = new Map();
  for (const pet of seed.pets) {
    const ownerId = ownerIds.get(pet.ownerKey);
    const speciesId = speciesIds.get(pet.speciesName.toLowerCase());
    const petId = await getPetId(pet, ownerId, speciesId);
    petIds.set(pet.key, petId);
    await ensureQrCode(pet, petId);
  }

  const [[{ max_id }]] = await db.query(
    "SELECT COALESCE(MAX(id), 0) AS max_id FROM vaccination_records"
  );
  let nextVaccinationId = Number(max_id) + 1;
  const vaccineByKey = new Map();
  for (const vaccination of seed.vaccinations) {
    if (!vaccineByKey.has(vaccination.speciesName)) {
      const speciesId = speciesIds.get(vaccination.speciesName.toLowerCase());
      const options = vaccinesBySpecies.get(String(speciesId));
      vaccineByKey.set(vaccination.speciesName, options[0].id);
    }
    nextVaccinationId = await ensureVaccination(
      vaccination,
      petIds.get(vaccination.petKey),
      vaccineByKey.get(vaccination.speciesName),
      nextVaccinationId
    );
  }

  for (const payment of seed.payments) {
    const pet = seed.pets.find((entry) => entry.key === payment.petKey);
    await ensurePayment(payment, ownerIds.get(payment.ownerKey), petIds.get(payment.petKey));
  }

  console.log(
    `Seeded 2025 analytics data: ${seed.owners.length} owners, ${seed.pets.length} pets, ` +
    `${seed.vaccinations.length} vaccinations, ${seed.payments.length} payments, and ${seed.pets.length} QR records.`
  );
}

async function main() {
  if (!process.argv.includes("--apply")) {
    const seed = createAnalyticsSeed2025();
    console.log(
      `Dry run: ready to seed ${seed.owners.length} owners, ${seed.pets.length} pets, ` +
      `${seed.vaccinations.length} vaccinations, and ${seed.payments.length} payments across 2025.`
    );
    console.log("Run with --apply to add clearly tagged synthetic records to the configured database.");
    await db.end();
    return;
  }

  try {
    await applySeed();
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("Unable to seed 2025 analytics data:", error);
  process.exitCode = 1;
});
