const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const db = require("../src/config/db");
const { CABUYAO_BARANGAYS } = require("../src/constants/cabuyaoBarangays");
const { generateQrForPet } = require("../src/utils/qrGenerator");

const PASSWORD_HASH =
  "$2a$10$aJR1jnObIGHB1dL0ZJYpQeMZxvq5doJ2UXzrzPvz/xn6gpSKq2e4m";

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260906);

const DATES = {
  today: new Date("2026-09-06T00:00:00Z"),
  daysAgo(n) {
    const d = new Date(this.today);
    d.setUTCDate(d.getUTCDate() - n);
    return d;
  },
  daysAhead(n) {
    const d = new Date(this.today);
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  },
};

const FIRST_NAMES = [
  "Juan", "Maria", "Jose", "Ana", "Pedro", "Elena", "Ramon", "Liza",
  "Carlos", "Marie", "Rafael", "Nena", "Andres", "Trisha", "Miguel",
  "Carla", "Dante", "Rosie", "Ernesto", "Gina", "Paolo", "Diana",
  "Fernando", "Iya", "Noel", "Cristina", "Mark", "Jasmine", "Leo",
  "Patricia", "Romeo", "Aira", "Bong", "Andrea", "Arnel", "Mica",
  "Rico", "Shiela", "Vince", "Kathlyn",
];

const LAST_NAMES = [
  "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza",
  "Torres", "Flores", "Ramos", "Dela Cruz", "Villanueva", "Aquino",
  "Navarro", "Salazar", "Castillo", "Domingo", "Rivera", "Perez",
  "Mercado", "Lopez", "Fernandez", "Gonzales", "Alonzo", "Santiago",
  "Padilla", "Serrano", "Manalo", "Tuazon", "Eusebio", "Dizon",
  "Aguilar", "Bonifacio", "Valdez", "Quinto", "Macapagal", "Laurel",
  "Rosales", "Camacho", "Molina",
];

const DOG_BREEDS = [
  { breed_id: 1, breed_custom: null },
  { breed_id: 2, breed_custom: null },
  { breed_id: 3, breed_custom: null },
  { breed_id: null, breed_custom: "Pomeranian" },
  { breed_id: null, breed_custom: "Beagle" },
  { breed_id: null, breed_custom: "Golden Retriever" },
  { breed_id: null, breed_custom: "Poodle" },
  { breed_id: null, breed_custom: "Aspin mix" },
];

const CAT_BREEDS = [
  { breed_id: 4, breed_custom: null },
  { breed_id: 5, breed_custom: null },
  { breed_id: null, breed_custom: "Tabby" },
  { breed_id: null, breed_custom: "Siamese" },
  { breed_id: null, breed_custom: "Calico" },
  { breed_id: null, breed_custom: "British Shorthair" },
];

const PET_NAMES = [
  "Bantay", "Buddy", "Brownie", "Max", "Charlie", "Rocky", "Kobe",
  "Lucky", "Bogart", "Pogi", "Bentong", "Ash", "Simba", "Oreo",
  "Pepper", "Choco", "Mochi", "Mingming", "Kitty", "Tiger", "Mocha",
  "Whiskey", "Snowy", "Patches", "Luna", "Stella", "Mimi", "Coco",
  "Panther", "Sushi", "Ginger", "Milo", "Mochi", "Bella", "Coco",
  "Duke", "Kuro", "Nala", "Ziggy", "Pancake",
];

const COLORS = [
  "Brown", "Black", "White", "Gray", "Orange", "Tan & White",
  "Black & White", "Brown & White", "Tri-color", "Cream", "Chocolate",
  "Silver",
];

const SUBDIVISIONS = [
  "San Isidro Heights", "Green Meadows", "Villa Corona", "Mabini Subdivision",
  "Amparo Subdivision", "Camella Homes", "Southville", "Executive Village",
  "Banlic Compound", "Villa Mercedes", "Sto. Nino Village", "Kale Homes",
  "Roseville", "Palm Grove", "Sunrise Homes", "Queens Row", "Golden Heights",
  "Bamboo Garden", "Faith Village", "Lakeside Subdivision",
];

const STREETS = [
  "M.H. Del Pilar", "J.P. Rizal", "Bonifacio St.", "A. Mabini St.",
  "Lopez Jaena St.", "San Nicolas St.", "Jose Abad Santos St.", "Burgos St.",
  "P. Gomez St.", "Marcos St.", "Purok 3", "Purok 5", "V. Luna St.",
  "Sampaguita St.", "Ilang-Ilang St.", "Rose St.", "Acacia St.",
  "Mahogany St.", "Narra St.",
];

const VACCINE_COMMENTS = [
  "Booster dose administered.",
  "First dose, schedule booster.",
  "Annual rabies boost.",
  "Healthy, no reaction.",
  null,
];

const DIAGNOSIS = [
  "Mild skin allergy, prescribed antihistamine.",
  "Annual wellness check, no concerns.",
  "Gastrointestinal upset, hydration therapy.",
  "Ear infection, cleaning and topical drops.",
  "Mild fever, supportive care.",
  "Dental tartar, scheduled cleaning.",
  "Parasite control follow-up.",
  "Respiratory infection, antibiotics prescribed.",
  "Joint stiffness in older pet, glucosamine supplement.",
  "Wound from minor fight, cleaned and dressed.",
];

const TREATMENT_PLANS = [
  "Antihistamine twice daily for 5 days, follow-up in 1 week.",
  "No treatment needed, continue regular diet and exercise.",
  "IV fluids and bland diet for 3 days.",
  "Ear cleaning solution twice daily for 7 days.",
  "Rest and fluids, monitor temperature.",
  "Dental prophylaxis in 2 weeks.",
  "Repeat deworming in 6 months.",
  "Full course of antibiotics, recheck in 1 week.",
  "Glucosamine daily, joint check in 3 months.",
  "Clean wound daily, observe for swelling.",
];

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function fmtTs(d) {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function buildAddress(barangay) {
  if (rng() < 0.55) {
    return `Blk ${randInt(1, 30)} Lot ${randInt(1, 30)}, ${pick(SUBDIVISIONS)}, ${barangay}`;
  }
  return `${randInt(100, 990)} ${pick(STREETS)}, Purok ${randInt(1, 9)}, ${barangay}`;
}

function buildContact() {
  return `09${randInt(10, 99)}${String(randInt(0, 99999999)).padStart(8, "0")}`;
}

function makeOwnerEmail(first, last, seq) {
  return `${first}.${last}${seq}`.toLowerCase().replace(/[^a-z0-9.]/g, "") + "@gmail.com";
}

function petCountFor(index) {
  const r = index % 10;
  if (r < 3) return 1;
  if (r < 5) return 3;
  if (r === 9) return 4;
  return 2;
}

async function main() {
  const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM pet_owners");
  const [[{ maxVaxId }]] = await db.query(
    "SELECT IFNULL(MAX(id), 0) AS maxVaxId FROM vaccination_records"
  );
  const [[{ lastSeq }]] = await db.query(
    "SELECT MAX(CAST(SUBSTRING_INDEX(pet_code, '-', -1) AS UNSIGNED)) AS lastSeq FROM pets"
  );

  if (total >= 180 && !process.env.FORCE_SEED) {
    console.log(`pet_owners already has ${total} rows. Skipping. Use FORCE_SEED=1 to run anyway.`);
    await db.end();
    return;
  }

  let ownerSeq = 0;
  let petSeq = lastSeq;
  let vaxId = maxVaxId;
  let ownerCount = 0;
  let petCount = 0;
  let qrCount = 0;
  let vaxCount = 0;

  const vaccinationRows = [];
  const locationRows = [];

  for (const barangay of CABUYAO_BARANGAYS) {
    for (let i = 0; i < 10; i++) {
      ownerSeq += 1;
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      const fullName = `${first} ${last}`;
      const email = makeOwnerEmail(first, last, ownerSeq);
      const contact = buildContact();
      const address = buildAddress(barangay);

      const [userResult] = await db.query(
        `INSERT INTO users (full_name, email, password, role, status)
         VALUES (?, ?, ?, 'Owner', 'active')`,
        [fullName, email, PASSWORD_HASH]
      );
      const userId = userResult.insertId;

      const [ownerResult] = await db.query(
        `INSERT INTO pet_owners (user_id, full_name, contact_number, address, barangay)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, fullName, contact, address, barangay]
      );
      const ownerId = ownerResult.insertId;
      ownerCount += 1;

      const petSlots = petCountFor(ownerSeq - 1);
      for (let p = 0; p < petSlots; p++) {
        petSeq += 1;
        const petCode = `PET-${new Date().getFullYear()}-${String(petSeq).padStart(6, "0")}`;
        const isDog = rng() < 0.75;
        const speciesId = isDog ? 1 : 2;
        const breed = isDog ? DOG_BREEDS[Math.floor(rng() * DOG_BREEDS.length)] : CAT_BREEDS[Math.floor(rng() * CAT_BREEDS.length)];
        const sex = rng() < 0.5 ? "Male" : "Female";
        const color = pick(COLORS);
        const ageYears = 0.5 + rng() * 11.5;
        const birthdate = DATES.daysAgo(Math.round(ageYears * 365));
        // Spread registration dates across the Verify Registration date
        // groups: today, this week, last week, last month, this year, older.
        let regDaysAgo;
        const bucketRoll = rng();
        if (bucketRoll < 0.08) regDaysAgo = 0;              // Today
        else if (bucketRoll < 0.20) regDaysAgo = randInt(1, 6);   // Earlier this week
        else if (bucketRoll < 0.32) regDaysAgo = randInt(7, 13);  // Last week
        else if (bucketRoll < 0.50) regDaysAgo = randInt(14, 45); // Last month
        else if (bucketRoll < 0.75) regDaysAgo = randInt(46, 300); // Earlier this year
        else regDaysAgo = randInt(301, 540);                 // Earlier registrations
        const registrationDate = DATES.daysAgo(regDaysAgo);
        const status = rng() < 0.85 ? "Verified" : "Registered";
        const isLost = rng() < 0.02;

        const [petResult] = await db.query(
          `INSERT INTO pets (
             pet_owner_id, pet_code, name, species_id, breed_id,
             breed_custom, sex, color, birthdate, registration_date,
             status, is_lost
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ownerId, petCode, pick(PET_NAMES), speciesId, breed.breed_id,
            breed.breed_custom, sex, color, fmtDate(birthdate),
            fmtDate(registrationDate), status, isLost,
          ]
        );
        const petId = petResult.insertId;
        petCount += 1;

        const { qrToken, imagePath } = await generateQrForPet(petId, petCode);
        await db.query(
          `INSERT INTO qr_codes (pet_id, qr_token, image_path, status, issue_date)
           VALUES (?, ?, ?, 'Generated', ?)`,
          [petId, qrToken, imagePath, fmtTs(new Date(registrationDate.getTime() + 86400000))]
        );
        qrCount += 1;

        const vaxRoll = rng();
        const vaxCountHere = vaxRoll < 0.35 ? 0 : vaxRoll < 0.8 ? 1 : 2;
        for (let v = 0; v < vaxCountHere; v++) {
          vaxId += 1;
          const vaccineId = rng() < 0.6 ? 1 : 2;
          const daysAfterReg = randInt(1, Math.max(2, regDaysAgo - 1));
          const administered = DATES.daysAgo(daysAfterReg - 1);
          const due = new Date(administered);
          due.setUTCDate(due.getUTCDate() + (vaccineId === 1 ? 365 : 365));
          const diffDays = Math.round((due - DATES.today) / 86400000);
          const vStatus = diffDays < 0 ? "Overdue" : diffDays <= 30 ? "Due" : "Updated";
          const vetId = rng() < 0.5 ? 17 : 1;
          vaccinationRows.push([
            vaxId, petId, vaccineId, fmtDate(administered), fmtDate(due),
            vStatus, vetId, pick(VACCINE_COMMENTS),
          ]);
          vaxCount += 1;
        }

        if (isLost) {
          await db.query(
            `UPDATE pets SET lost_date = ?, last_seen = ?, reward = ? WHERE id = ?`,
            [fmtDate(DATES.daysAgo(randInt(2, 20))), address, randInt(500, 3000), petId]
          );
        }
      }

      const locDays = randInt(1, 30);
      locationRows.push([
        ownerId,
        (14.2236 + rng() * 0.04).toFixed(6),
        (121.1215 + rng() * 0.02).toFixed(6),
        randInt(8, 25),
        fmtTs(DATES.daysAgo(locDays)),
      ]);
      if (rng() < 0.4) {
        locationRows.push([
          ownerId,
          (14.2236 + rng() * 0.04).toFixed(6),
          (121.1215 + rng() * 0.02).toFixed(6),
          randInt(8, 25),
          fmtTs(DATES.daysAgo(randInt(31, 60))),
        ]);
      }

      if (ownerCount % 45 === 0) {
        console.log(`Progress: ${ownerCount} owners / ${petCount} pets`);
      }
    }
  }

  if (vaccinationRows.length) {
    await db.query(
      `INSERT INTO vaccination_records
         (id, pet_id, vaccine_id, date_administered, next_due_date, status, administered_by, comments)
       VALUES ?`,
      [vaccinationRows]
    );
  }

  if (locationRows.length) {
    await db.query(
      `INSERT INTO owner_locations (pet_owner_id, latitude, longitude, accuracy_meters, recorded_at)
       VALUES ?`,
      [locationRows]
    );
  }

  console.log("");
  console.log("Seeding complete:");
  console.log(`  Owners:       ${ownerCount}`);
  console.log(`  Pets:         ${petCount}`);
  console.log(`  QR codes:     ${qrCount}`);
  console.log(`  Vaccinations: ${vaxCount}`);
  console.log(`  Locations:    ${locationRows.length}`);

  await db.end();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  try {
    await db.end();
  } catch (_) {}
  process.exit(1);
});