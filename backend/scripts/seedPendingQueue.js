const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const db = require("../src/config/db");
const bcrypt = require("bcryptjs");
const { CABUYAO_BARANGAYS } = require("../src/constants/cabuyaoBarangays");

// Same demo password as the other demo accounts.
const DEMO_PASSWORD = "Demo1234!";

// Fresh, still-pending (unverified) registrations so the staff Verify
// Registration page has a visible queue in the "Today" / "Earlier this week"
// groups. Mirrors the real flow: a registered pet has status 'Registered' and
// no QR code yet; staff verification flips it to 'Verified' and generates the QR.
const PENDING_OWNERS = [
  {
    email: "pending.demo1@cityvet.gov.ph",
    fullName: "Leah Fernandez",
    pets: [
      { name: "Mochi", speciesId: 2, breedCustom: "Siamese", sex: "Female", color: "Cream" },
      { name: "Rocky", speciesId: 1, breedCustom: "Aspin mix", sex: "Male", color: "Brown & White" },
    ],
  },
  {
    email: "pending.demo2@cityvet.gov.ph",
    fullName: "Kevin Andrade",
    pets: [
      { name: "Butters", speciesId: 1, breedCustom: "Beagle", sex: "Male", color: "Tri-color" },
    ],
  },
  {
    email: "pending.demo3@cityvet.gov.ph",
    fullName: "Andrea Villanueva",
    pets: [
      { name: "Biscuit", speciesId: 1, breedCustom: "Poodle", sex: "Female", color: "White" },
      { name: "Simba", speciesId: 2, breedCustom: "Tabby", sex: "Male", color: "Orange" },
    ],
  },
];

function fmtDate(date) {
  return date.toISOString().slice(0, 10);
}

function utcDaysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function main() {
  const makeContact = (index) => `09${17 + index}${String(10000000 + index * 137).slice(0, 8)}`;

const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM users");
  const year = new Date().getFullYear();
  const [rows] = await db.query(
    "SELECT pet_code FROM pets WHERE pet_code LIKE ? ORDER BY pet_code DESC LIMIT 1",
    [`PET-${year}-%`]
  );
  let petSeq = rows.length ? parseInt(rows[0].pet_code.split("-")[2], 10) : 0;
  let ownersCreated = 0;
  let petsCreated = 0;

  for (let i = 0; i < PENDING_OWNERS.length; i++) {
    const entry = PENDING_OWNERS[i];
    const [[existing]] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [entry.email]
    );
    if (existing) {
      console.log(`Skip ${entry.email} (owner already exists).`);
      continue;
    }

    const barangay = CABUYAO_BARANGAYS[i % CABUYAO_BARANGAYS.length];
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const [userResult] = await db.query(
      `INSERT INTO users (full_name, email, password, role, status)
       VALUES (?, ?, ?, 'Owner', 'active')`,
      [entry.fullName, entry.email, passwordHash]
    );
    const userId = userResult.insertId;

    const [ownerResult] = await db.query(
      `INSERT INTO pet_owners (user_id, full_name, contact_number, address, barangay)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, entry.fullName, makeContact(i), `Blk ${12 + i} Lot ${5 + i}, Sun Valley Homes, ${barangay}`, barangay]
    );
    const ownerId = ownerResult.insertId;
    ownersCreated += 1;

    for (let p = 0; p < entry.pets.length; p++) {
      petSeq += 1;
      const pet = entry.pets[p];
      const petCode = `PET-${year}-${String(petSeq).padStart(6, "0")}`;
      // Today's registration lands in the "Today" group; yesterday lands in
      // "Earlier this week" so the queue spans two groups.
      const registrationDate = p === 0 ? utcDaysAgo(0) : utcDaysAgo(1);
      const birthdate = utcDaysAgo(365 + p * 400);

      const [petResult] = await db.query(
        `INSERT INTO pets (
           pet_owner_id, pet_code, name, species_id, breed_id,
           breed_custom, sex, color, birthdate, registration_date,
           status
         ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'Registered')`,
        [
          ownerId, petCode, pet.name, pet.speciesId, pet.breedCustom,
          pet.sex, pet.color, fmtDate(birthdate), fmtDate(registrationDate),
        ]
      );
      petsCreated += 1;
      console.log(`+ ${entry.fullName} / ${pet.name} (${petCode}) — ${fmtDate(registrationDate)}, status Registered (pending)`);
    }
  }

  console.log("");
  console.log("Pending queue seeded:");
  console.log(`  Owners created: ${ownersCreated}`);
  console.log(`  Pending pets:   ${petsCreated}`);
  console.log("");
  console.log("Log in as: pending.demo1@cityvet.gov.ph (password Demo1234!)");
  console.log("Staff → Verify Registration should now show these as Pending.");

  await db.end();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  try {
    await db.end();
  } catch (_) {}
  process.exit(1);
});