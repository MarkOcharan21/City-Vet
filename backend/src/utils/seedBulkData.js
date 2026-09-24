// seedBulkData.js — bulk demo data so the system reaches ~1,000 registered pets
// with realistic records in every barangay of Cabuyao and in every portal:
//   Owner, Staff/Veterinarian, and Admin.
//
// Run:  npm run seed:bulk            (or: node src/utils/seedBulkData.js)
//
// What it creates (on top of existing data):
//   • 520 new pet owners (distributed across all 18 barangays) + 620 new pets
//     → ~1,010 registered pets total
//   • QR codes for every new pet, owner locations, vaccination records,
//     consultations + prescriptions, preventive care, procedures, payments
//     (official receipts + payment monitoring), outreach transactions,
//     record requests, announcements, drafts, notifications, and audit logs.
//   • 1 new Veterinarian + 2 new Staff accounts.
//
// All new logins use password:  Demo1234!
//
// Safe guard: the script refuses to run twice unless FORCE=1 is set.
//
//   FORCE=1 node src/utils/seedBulkData.js

require("dotenv").config();

const bcrypt = require("bcryptjs");
let db = require("../config/db");
let TXN = null;
const { generateQrForPet } = require("./qrGenerator");
const { generatePaymentQR } = require("./qrHelper");
const { generatePmToken, writeReceiptQrImage } = require("./qrReceipt");
const { generateOutreachQr, generateQrToken } = require("./outreachQrGenerator");

const PASSWORD = "Demo1234!";
const MARKER_EMAIL = "bulk.seed.run@cityvet.gov.ph";
const YEAR = new Date().getFullYear();
const TODAY = new Date();
TODAY.setHours(12, 0, 0, 0);

const NEW_OWNERS = 520;
const EXTRA_PETS = 100;

const MULTI_INSERT = 25;

function iso(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}
function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pad(n) {
  return String(n).padStart(6, "0");
}
function SQL_DT(d) {
  if (!d) return null;
  return iso(d);
}
function SQL_TS(d) {
  if (!d) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
const REF = {
  species: { Dog: 1, Cat: 2 },
  breedsBySpecies: { 1: [], 2: [] },
  medicines: [],
  vaccines: { antiRabies: 1, dogSeries: 2, catSeries: 3 },
  vetIds: [],
  staffIds: [],
  payTypes: {},
  programs: [],
  maxVaxId: 0,
  maxOutTx: 0,
  petCodeSeq: 0,
  orSeq: 0,
  rcptSeq: 0,
};

let hashes = [];
let hashIndex = 0;
let nextHash = () => hashes[hashIndex++ % hashes.length];

async function loadReference() {
  const [speciesRows] = await db.query("SELECT id, species_name FROM species");
  for (const s of speciesRows) REF.species[s.species_name] = s.id;

  const [breedRows] = await db.query("SELECT id, breed_name, species_id FROM breeds");
  for (const b of breedRows) REF.breedsBySpecies[b.species_id].push(b);

  const [meds] = await db.query("SELECT id, medicine_name FROM medicines");
  REF.medicines = meds;

  const [users] = await db.query(
    "SELECT id, role FROM users WHERE role IN ('Staff','Veterinarian')"
  );
  for (const u of users) {
    if (u.role === "Veterinarian") REF.vetIds.push(u.id);
    else REF.staffIds.push(u.id);
  }

  const [pts] = await db.query("SELECT id, type_name FROM payment_types");
  for (const p of pts) REF.payTypes[p.type_name] = p.id;

  const [progRows] = await db.query("SELECT id FROM outreach_programs");
  REF.programs = progRows.map((p) => p.id);

  const [[{ n }]] = await db.query("SELECT COALESCE(MAX(id),0) AS n FROM vaccination_records");
  REF.maxVaxId = Number(n);

  const [[{ o }]] = await db.query("SELECT COALESCE(MAX(id),0) AS o FROM outreach_transactions");
  REF.maxOutTx = Number(o);

  const [[{ pet_code: latestCode }]] = await db.query(
    "SELECT pet_code FROM pets WHERE pet_code LIKE ? ORDER BY pet_code DESC LIMIT 1",
    [`PET-${YEAR}-%`]
  );
  REF.petCodeSeq = latestCode ? parseInt(latestCode.split("-")[2], 10) + 1 : 1;

  const [[{ r }]] = await db.query("SELECT COALESCE(MAX(id),0) AS r FROM official_receipts");
  REF.orSeq = Number(r) + 100000;

  const [marker] = await db.query("SELECT id FROM users WHERE email = ?", [MARKER_EMAIL]);
  if (marker.length && process.env.FORCE !== "1") {
    console.log(
      "Bulk seed already ran before (marker user exists).\nSet FORCE=1 to run again."
    );
    await db.end();
    process.exit(0);
  }

  for (let i = 0; i < 20; i++) hashes.push(await bcrypt.hash(PASSWORD, 8));
  console.log(`Loaded reference. pet code starts at PET-${YEAR}-${pad(REF.petCodeSeq)}`);
}

// ---------------------------------------------------------------------------
// Names / locations
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "Juan", "Maria", "Jose", "Ana", "Pedro", "Liza", "Marco", "Ella", "Rico", "Gina",
  "Paolo", "Mica", "Nena", "Romeo", "Cristina", "Vince", "Patricia", "Jasmine",
  "Rafael", "Diana", "Kathlyn", "Trisha", "Jerome", "Angela", "Dennis", "Cherry",
  "Allan", "Rosie", "Miguel", "Sandra", "Kevin", "Joy", "Arthur", "Grace", "Noli",
  "Marites", "Erwin", "Sheila", "Danilo", "Irene", "Ferdinand", "Rizza", "Gregorio",
  "Lorena", "Emilio", "Cecilia", "Ramon", "Fe", "Leonardo", "Mercedes", "Bernard",
  "Natasha", "Oscar", "Vivienne", "Hector", "Miriam", "Edwin", "Carmen", "Raymund",
  "Dalisay", "Arnold",
];
const LAST_NAMES = [
  "Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Dela Cruz", "Aguilar", "Mendoza",
  "Fernandez", "Gonzales", "Valdez", "Castillo", "Manalo", "Santiago", "Perez",
  "Padilla", "Flores", "Rosales", "Dizon", "Laurel", "Tuazon", "Molina", "Rivera",
  "Villanueva", "Ramos", "Salazar", "Domingo", "Aquino", "Soriano", "Navarro",
  "Marquez", "Canlas", "De Guzman", "Tolentino", "Lopez", "Ocampo", "Ramirez",
  "Fajardo", "Imperial", "Sarmiento", "Villamor", "Abad", "Enriquez", "Sison",
  "Pineda", "Mercado", "Quinto", "Vergara",
];
const MID_INITIALS = "ABCDEFGHJKLMNPQRSTVWXYZ";
const PHONE_PREFIXES = ["0917", "0918", "0920", "0927", "0939", "0949", "0966", "0977", "0999"];

function randPhone() {
  return randPick(PHONE_PREFIXES) + String(randInt(1000000, 9999999));
}
function randAddress(barangay) {
  const street = randPick([
    "National Highway", "J.P. Rizal St.", "M.H. Del Pilar St.", "Purok 1", "Purok 2",
    "Purok 3", "Purok 4", "Sitio Kanluran", "Sitio Silangan", "Halang St.",
    "Langkas St.", "Virgin de los Remedios St.", "Marcos St.", "Silangan Rd.",
  ]);
  return `Blk. ${randInt(1, 12)} Lot ${randInt(1, 60)}, ${street}, Brgy. ${barangay}, Cabuyao, Laguna`;
}
function randFullName() {
  return `${randPick(FIRST_NAMES)} ${randPick(MID_INITIALS)}. ${randPick(LAST_NAMES)}`;
}
function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const BARANGAY_WEIGHTS = [
  ["Barangay Uno (Pob.)", 30],
  ["Barangay Dos (Pob.)", 30],
  ["Barangay Tres (Pob.)", 28],
  ["Banaybanay", 36],
  ["Pulo", 36],
  ["San Isidro", 36],
  ["Bigaa", 32],
  ["Niugan", 32],
  ["Mamatid", 30],
  ["Casile", 28],
  ["Diezmo", 26],
  ["Sala", 26],
  ["Marinig", 24],
  ["Gulod", 24],
  ["Butong", 22],
  ["Banlic", 22],
  ["Baclaran", 20],
  ["Pittland", 18],
];
const BARANGAY_POOL = [];
for (const [b, w] of BARANGAY_WEIGHTS) for (let k = 0; k < w; k++) BARANGAY_POOL.push(b);

function randLocation() {
  return {
    latitude: Number(randFloat(14.238, 14.285).toFixed(7)),
    longitude: Number(randFloat(121.098, 121.142).toFixed(7)),
    accuracy: randInt(8, 25),
  };
}

// ---------------------------------------------------------------------------
// Pets
// ---------------------------------------------------------------------------
const DOG_BREED_IDS = { Aspin: 1, ShihTzu: 2, Labrador: 3 };
const CAT_BREED_IDS = { Puspin: 4, Persian: 5 };
const DOG_CUSTOM = [
  "Aspin Mix", "Golden Retriever", "Beagle", "Chihuahua", "Poodle", "Siberian Husky",
  "Bulldog", "Askals", "Rottweiler", "Pug", "Doberman", "Shih Tzu Mix",
];
const CAT_CUSTOM = [
  "Tabby", "Siamese", "British Shorthair", "Sphynx", "Calico", "Russian Blue", "Bengal",
];
const DOG_NAMES = [
  "Brownie", "Max", "Buddy", "Lucky", "Snowy", "Bantay", "Cookie", "Bogart", "Chico",
  "Dodong", "Pipoy", "Kobe", "Thor", "Charlie", "Cooper", "Milo", "Rocky", "Bruno",
  "Kiko", "Bagel", "Mango", "Coco", "Bobby", "Rex", "Jack", "Odie", "Onyok", "Pepper",
  "Zeus", "Ash", "Toby", "Rusty", "Duke", "Bogart",
];
const CAT_NAMES = [
  "Mingming", "Ginger", "Luna", "Mochi", "Mimi", "Kitty", "Tiger", "Whiskers",
  "Simba", "Oreo", "Snow", "Chibi", "Garfield", "Chuchay", "Bibi", "Tom", "Pipay",
  "Cocoy", "Muning", "Smokey",
];
const COLORS = [
  "Black", "White", "Brown", "Tan", "Gray", "Orange", "Black and White",
  "White/Orange", "Chocolate", "Cream", "Tricolor", "Light Brown",
];
const COND_NONE = ["None", "None", "None", "None"];
const CONDITIONS = [
  COND_NONE,
  ["Skin allergy", "None", "None", "Avoid floor shampoo"],
  ["Flea allergy dermatitis", "None", "None", "Monthly flea preventive"],
  ["None", "Amoxicillin (inactive)", "None", "None"],
  ["None", "None", "Epilepsy (controlled)", "No strenuous walks in heat"],
  ["None", "Dewormer", "None", "Feed only vet-recommended diet"],
  ["None", "None", "None", "Bathing only with mild soap"],
];

function makePet(ownerId, opts = {}) {
  const speciesId = opts.speciesId || (Math.random() < 0.65 ? REF.species.Dog : REF.species.Cat);
  const isDog = speciesId === REF.species.Dog;

  let breedId = null;
  let breedCustom = null;
  if (isDog) {
    const roll = Math.random();
    if (roll < 0.45) breedId = DOG_BREED_IDS.Aspin;
    else if (roll < 0.6) breedId = DOG_BREED_IDS.Shihtzu;
    else if (roll < 0.7) breedId = DOG_BREED_IDS.Labrador;
    else breedCustom = randPick(DOG_CUSTOM);
  } else {
    const roll = Math.random();
    if (roll < 0.5) breedId = CAT_BREED_IDS.Puspin;
    else if (roll < 0.62) breedId = CAT_BREED_IDS.Persian;
    else breedCustom = randPick(CAT_CUSTOM);
  }

  const birthdate = addDays(TODAY, -randInt(120, 4380));
  let registration = addDays(birthdate, randInt(60, 400));
  if (registration > TODAY) registration = new Date(TODAY);

  const isNew = opts.recent || Math.random() < 0.08;
  const status = isNew ? "Registered" : "Verified";

  const cond = Math.random() < 0.55 ? COND_NONE : randPick(CONDITIONS);

  const isLost = !isNew && Math.random() < 0.015;
  const lostDate = isLost ? addDays(TODAY, -randInt(1, 20)) : null;

  return {
    pet_owner_id: ownerId,
    name: randPick(isDog ? DOG_NAMES : CAT_NAMES),
    speciesId,
    breedId,
    breedCustom,
    sex: Math.random() < 0.5 ? "Male" : "Female",
    color: randPick(COLORS),
    birthdate: iso(birthdate),
    registration_date: iso(registration),
    status,
    allergies: cond[0],
    medication: cond[1],
    conditions: cond[2],
    instructions: cond[3],
    is_lost: isLost ? 1 : 0,
    lost_date: lostDate ? SQL_DT(lostDate) : null,
    last_seen: isLost ? randPick([
      "Near barangay hall", "Last seen at home", "Sightings along the highway",
      "Last seen at the market", "Near the covered court",
    ]) : null,
    reward: isLost ? randPick(["PHP 500", "PHP 1,000", "PHP 2,000", "Salamat po"]) : null,
  };
}

// ---------------------------------------------------------------------------
// Vaccination
// ---------------------------------------------------------------------------
function vaccinatePet(pet, petId) {
  const records = [];
  const birth = new Date(pet.birthdate + "T00:00:00");
  const ageDays = Math.floor((TODAY - birth) / 864e5);
  const speciesId = pet.speciesId;
  const seriesVaccine =
    speciesId === REF.species.Dog ? REF.vaccines.dogSeries : REF.vaccines.catSeries;

  function statusFor(nextDue) {
    const diff = (new Date(nextDue) - TODAY) / 864e5;
    if (diff < 0) return "Overdue";
    if (diff <= 60) return "Due";
    return "Updated";
  }

  function push(vaccineId, doseNo, doseLabel, lastDate, nextDue, comments) {
    records.push([
      petId, vaccineId, doseNo, doseLabel, iso(lastDate), iso(nextDue),
      statusFor(nextDue), comments, SQL_DT(new Date(lastDate)),
    ]);
  }

  if (ageDays > 90 && Math.random() < 0.95) {
    const last = addDays(TODAY, -randInt(30, 400));
    const next = addDays(last, 365);
    push(
      REF.vaccines.antiRabies, 1, "Annual Dose", last, next,
      randPick(["Anti-Rabies annual", "Anti-Rabies booster", "Rabies vaccination"])
    );
  }

  if (ageDays > 42) {
    const num =
      ageDays < 90 ? 1 : ageDays < 160 ? 2 : randInt(3, 4);
    for (let d = 1; d <= num; d++) {
      const last = addDays(TODAY, -randInt(20, 260));
      const next = d >= 3 ? addDays(last, 365) : addDays(last, 28);
      push(seriesVaccine, d, `Dose ${d}`, last, next, d === 1 ? "Initial dose" : `Booster dose ${d}`);
    }
  }

  return records;
}

// ---------------------------------------------------------------------------
// Clinical
// ---------------------------------------------------------------------------
const DOG_DIAGS = [
  ["Otitis externa with erythema", "Ear cleaning + anti-inflammatory; recheck in 10 days."],
  ["Flea allergic dermatitis", "Flea control + antihistamine; environmental sanitization."],
  ["Mild gastroenteritis / diarrhea", "Gastroprotectants + bland diet for 3 days."],
  ["Skin infection / pyoderma", "Topical + systemic antibiotic course."],
  ["Routine wellness exam", "Annual checkup; no abnormalities noted."],
  ["Tick fever suspected", "CBC + blood smear; doxycycline course if positive."],
  ["Minor wound / abrasion", "Wound cleaning + antibiotics; prevent licking."],
  ["Dental disease (tartar)", "Dental prophylaxis; home dental care advised."],
  ["Allergic rhinitis", "Antihistamine; avoid dust and smoke."],
  ["Deworming follow-up", "Fecalysis + broad-spectrum dewormer."],
];
const CAT_DIAGS = [
  ["Feline dermatitis with pruritus", "Anti-itch + topical therapy; hypoallergenic diet."],
  ["Upper respiratory infection (URI)", "Supportive care + eye/nasal cleaning."],
  ["Hairball obstruction (mild)", "Laxative gel + increased hydration."],
  ["Ear mite infestation", "Topical miticide; treat all in-contact pets."],
  ["Routine wellness exam", "Annual checkup; weight and dental check."],
  ["Diarrhea of acute onset", "Gastroprotectant + hydration; stool check."],
  ["Flea infestation", "Flea control; treat household environment."],
  ["Dental disease (gingivitis)", "Dental cleaning; oral care plan."],
];
const MED_BIAS = {
  skin: ["Chlorpheniramine", "Prednisolone", "Enrofloxacin (Baytril)", "Frontline Spray"],
  infection: ["Amoxicillin", "Doxycycline", "Enrofloxacin (Baytril)"],
  deworm: ["Pyrantel Pamoate", "Ivermectin", "Metronidazole"],
  general: ["Vitamin B Complex", "Carprofen", "Oral Rehydration Salts", "Frontline Spray"],
};
const DOSE = [
  ["1 tablet", "2x daily", "5 days", "After meals"],
  ["1 tablet", "1x daily", "7 days", "With food"],
  ["0.5 mL / 5kg", "1x daily", "5 days", "Shake well before use"],
  ["1 tsp", "2x daily", "3 days", "Mixed with water or food"],
  ["2 drops", "2x daily", "10 days", "Into the ear"],
];
const PREVENTIVE_PRODUCTS = {
  Deworming: ["Pyrantel Pamoate", "Drontal", "Milbemax"],
  "Flea / Tick Preventive": ["Frontline Spray", "Revolution", "Advocate spot-on"],
  "Heartworm Preventive": ["Heartgard", "Revolution", "Advocate spot-on"],
};
const PROCEDURES = [
  ["Spay / Neuter", "Spay surgery (OVH)", "Post-op recovery uneventful."],
  ["Spay / Neuter", "Neuter (castration)", "Healing well."],
  ["Dental", "Dental prophylaxis", "Tartar removed; mild gingivitis."],
  ["Laboratory", "CBC + blood smear", "Within normal limits."],
  ["Laboratory", "Fecalysis", "Negative for parasites."],
  ["Laboratory", "Skin scraping", "No mites seen."],
  ["Grooming", "Full grooming", "Both ears cleaned; nails trimmed."],
  ["Other", "Chip scan / weight check", "No abnormalities."],
];

function diagFor(speciesId) {
  return randPick(speciesId === REF.species.Dog ? DOG_DIAGS : CAT_DIAGS);
}
function medicineIds(names) {
  return names.map((x) => REF.medicines.find((m) => m.medicine_name === x)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Insert helpers
// ---------------------------------------------------------------------------
async function insertUser(email, role, fullName, createdAt) {
  const hash = nextHash();
  const [r] = await db.query(
    `INSERT INTO users (email, password, role, status, full_name, created_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
    [email, hash, role, fullName, SQL_TS(createdAt)]
  );
  return r.insertId;
}

async function insertOwner(userId, owner) {
  const [r] = await db.query(
    `INSERT INTO pet_owners
       (user_id, full_name, contact_number, address, barangay,
        emergency_contact_name, emergency_contact_number, is_payment_current, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      userId, owner.full_name, owner.contact_number, owner.address, owner.barangay,
      owner.emergency_contact_name, owner.emergency_contact_number, SQL_TS(owner.created_at),
    ]
  );
  return r.insertId;
}

async function insertOwnerLocation(ownerId, loc, recordedAt) {
  await db.query(
    `INSERT INTO owner_locations (pet_owner_id, latitude, longitude, accuracy_meters, status, recorded_at)
     VALUES (?, ?, ?, ?, 'active', ?)`,
    [ownerId, loc.latitude, loc.longitude, loc.accuracy, SQL_TS(recordedAt)]
  );
}

async function insertPet(pet) {
  const petCode = `PET-${YEAR}-${pad(REF.petCodeSeq)}`;
  REF.petCodeSeq++;
  const [r] = await db.query(
    `INSERT INTO pets
       (pet_owner_id, pet_code, name, species_id, breed_id, breed_custom, sex, color,
        birthdate, registration_date, status, photo, allergies, current_medication,
        important_conditions, special_instructions, is_lost, lost_date, last_seen, reward)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pet.pet_owner_id, petCode, pet.name, pet.speciesId, pet.breedId, pet.breedCustom,
      pet.sex, pet.color, pet.birthdate, pet.registration_date, pet.status,
      pet.allergies, pet.medication, pet.conditions, pet.instructions,
      pet.is_lost, pet.lost_date, pet.last_seen, pet.reward,
    ]
  );
  const petId = r.insertId;

  const qr = await generateQrForPet(petId, petCode);
  await db.query(
    `INSERT INTO qr_codes (pet_id, qr_token, image_path, issue_date, status, created_at)
     VALUES (?, ?, ?, ?, 'Generated', ?)`,
    [petId, qr.qrToken, qr.imagePath, SQL_DT(new Date(pet.registration_date)), SQL_TS(new Date(pet.registration_date))]
  );

  return { petId, petCode, pet };
}

async function insertVaccinations(records) {
  for (const r of records) {
    REF.maxVaxId++;
    await db.query(
      `INSERT INTO vaccination_records
         (id, pet_id, vaccine_id, dose_no, dose_label, date_administered, next_due_date,
          status, administered_by, comments, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [REF.maxVaxId, r[0], r[1], r[2], r[3], r[4], r[5], r[6], randPick(REF.vetIds), r[7], r[8]]
    );
  }
}

async function insertConsultation(petId, speciesId) {
  const [diagnosis, plan] = diagFor(speciesId);
  const cDate = addDays(TODAY, -randInt(3, 260));
  const followUp = addDays(cDate, randInt(7, 20));
  const [r] = await db.query(
    `INSERT INTO consultation_records (pet_id, diagnosis, treatment_plan, consultation_date, follow_up_date, vet_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [petId, diagnosis, plan, SQL_DT(cDate), SQL_DT(followUp), randPick(REF.vetIds)]
  );
  return { id: r.insertId, diagnosis, cDate };
}

async function insertPrescription(consultId, diagnosis, cDate) {
  let bias = MED_BIAS.general;
  const dj = `${diagnosis} `.toLowerCase();
  if (dj.includes("skin") || dj.includes("dermatitis") || dj.includes("ear")) bias = MED_BIAS.skin;
  else if (dj.includes("infection") || dj.includes("pyoderma")) bias = MED_BIAS.infection;
  else if (dj.includes("worm") || dj.includes("para") || dj.includes("diarr")) bias = MED_BIAS.deworm;
  const meds = medicineIds(randPick([bias, MED_BIAS.general]));
  const [rx] = await db.query(
    "INSERT INTO prescriptions (consultation_id, prescribed_date) VALUES (?, ?)",
    [consultId, SQL_DT(cDate)]
  );
  const rxId = rx.insertId;
  const n = Math.min(meds.length, randInt(1, 2));
  for (let i = 0; i < n; i++) {
    const [qty, freq, dur, instr] = randPick(DOSE);
    await db.query(
      `INSERT INTO prescription_items
         (prescription_id, medicine_id, quantity, dosage, frequency, duration, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [rxId, meds[i].id, `${randInt(1, 30)} tablets`, `${qty}`, freq, dur, instr]
    );
  }
}

async function insertPreventiveCare(petId) {
  const type = randPick(Object.keys(PREVENTIVE_PRODUCTS));
  const product = randPick(PREVENTIVE_PRODUCTS[type]);
  const administered = addDays(TODAY, -randInt(10, 120));
  const next = addDays(administered, randPick([90, 120, 180]));
  await db.query(
    `INSERT INTO preventive_care_records (pet_id, care_type, product_name, date_administered, next_due_date, administered_by, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [petId, type, product, SQL_DT(administered), SQL_DT(next), `Dr. ${randPick(LAST_NAMES)}`, randPick(["Routine care", "Annual schedule", ""])]
  );
}

async function insertProcedure(petId) {
  const [type, name, note] = randPick(PROCEDURES);
  const pDate = addDays(TODAY, -randInt(5, 200));
  await db.query(
    `INSERT INTO pet_procedures (pet_id, procedure_type, procedure_name, procedure_date, veterinarian, result_notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [petId, type, name, SQL_DT(pDate), `Dr. ${randPick(LAST_NAMES)}`, note]
  );
}

async function insertPayment(typeId, petId, ownerId, orId, orNumber, amount, pDate, staffId, status, rejectReason) {
  const [r] = await db.query(
    `INSERT INTO payments
       (pet_owner_id, pet_id, payment_type_id, or_id, or_number, amount, payment_date,
        payment_status, validation_status, rejection_reason, reviewed_at, reviewed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ownerId, petId, typeId, orId, orNumber, amount, SQL_DT(pDate),
      status === "Verified" ? "Paid" : "Pending",
      status,
      rejectReason || null,
      status !== "Pending Verification" ? SQL_TS(pDate) : null,
      status !== "Pending Verification" ? staffId : null,
    ]
  );
  const payId = r.insertId;
  try {
    const qr = await generatePaymentQR(payId);
    await db.query("UPDATE payments SET qr_code_path = ? WHERE id = ?", [qr, payId]);
  } catch (err) {
    /* non-fatal */
  }
  return payId;
}

async function insertOfficialReceipt(ownerId, items, staffId) {
  REF.orSeq++;
  const orNumber = `OR-2026-${REF.orSeq}`;
  const total = items.reduce((s, it) => s + it.amount, 0);
  const pDate = addDays(TODAY, -randInt(1, 40));
  const roll = Math.random();
  const status = roll < 0.6 ? "Verified" : roll < 0.85 ? "Pending Verification" : "Rejected";
  const [or] = await db.query(
    `INSERT INTO official_receipts (pet_owner_id, or_number, total_amount, or_photo_path, payment_date, status, created_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?)`,
    [ownerId, orNumber, total, SQL_DT(pDate), status === "Verified" ? "Verified" : "Pending", SQL_TS(pDate)]
  );
  const orId = or.insertId;
  for (const it of items) {
    await insertPayment(
      it.typeId, it.petId, ownerId, orId, orNumber, it.amount, pDate,
      staffId, status,
      status === "Rejected" ? "OR photo unclear, please resubmit a clearer photo." : null
    );
  }
  if (status === "Verified") {
    await db.query("UPDATE pet_owners SET is_payment_current = 1 WHERE id = ?", [ownerId]);
  }
  return orId;
}

async function insertPmRecord(staffId, ownerId, pet) {
  REF.rcptSeq++;
  const orNumber = `RCPT-2026-${String(REF.rcptSeq).padStart(8, "0")}`;
  const types = ["Consultation", "Vaccination", "Medicine"];
  const pt = randPick(types);
  const amount = pt === "Consultation" ? 250 : pt === "Vaccination" ? 300 : 150;
  const pDate = addDays(TODAY, -randInt(0, 60));
  const pmToken = generatePmToken();
  const med = pt === "Medicine" ? randPick(REF.medicines) : null;
  const orTime = `${String(randInt(8, 16)).padStart(2, "0")}:${String(randInt(0, 59)).padStart(2, "0")}:00`;
  await db.query(
    `INSERT INTO payment_monitoring
       (or_number, or_amount, or_date, or_time, or_description, payment_items, or_photo_path,
        ocr_text, ocr_confidence, pet_owner_id, payment_type, medicine_id, medicine_quantity,
        medicine_total, recorded_by, remarks, pm_token, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, NULL, ?, NOW())`,
    [
      orNumber, amount, SQL_DT(pDate), orTime, `${pt} charge - ${pet.name}`,
      ownerId, pt, med ? med.id : null, med ? `${randInt(1, 3)} unit(s)` : null,
      med ? amount : null, staffId, pmToken,
    ]
  );
  const id = (await db.query("SELECT LAST_INSERT_ID() AS id"))[0][0].id;
  try {
    const qrp = await writeReceiptQrImage(pmToken);
    await db.query("UPDATE payment_monitoring SET receipt_qr_path = ? WHERE id = ?", [qrp, id]);
  } catch (err) {
    /* non-fatal */
  }
  return id;
}

async function insertRecordRequest(ownerId, petId) {
  const type = randPick([
    "Vaccination Certificate", "Medical Records", "Registration Certificate",
    "Animal Health Certificate", "Official Receipt Copy",
  ]);
  const purpose = randPick([
    "Travel requirement", "City registration renewal", "School / HOA requirement",
    "Insurance claim", "Kennel / adoption records", "Reference for another clinic",
  ]);
  const format = Math.random() < 0.55 ? "PDF" : "Printed";
  const issued = Math.random() < 0.45;
  const requested = addDays(TODAY, -randInt(1, 60));
  await db.query(
    `INSERT INTO record_requests
       (pet_owner_id, pet_id, request_type, purpose, format, comments, status, requested_date, issued_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ownerId, petId, type, purpose, format,
      Math.random() < 0.4 ? randPick(["Urgent please", "Need before the weekend", "Certified copy", ""]) : "",
      issued ? "Issued" : "Pending",
      SQL_TS(requested),
      issued ? SQL_TS(addDays(requested, randInt(2, 8))) : null,
    ]
  );
}

async function insertOutreachTx(programId, staffId, ownerSnap) {
  REF.maxOutTx++;
  const qrToken = generateQrToken();
  const { imagePath } = await generateOutreachQr(qrToken);
  const roll = Math.random();
  const status =
    roll < 0.55 ? "Verified" : roll < 0.7 ? "Submitted" : roll < 0.85 ? "Pending" : "Rejected";
  const programDate = programId === 5 ? addDays(TODAY, randInt(1, 6)) : addDays(TODAY, -randInt(1, 20));
  const items = [{ name: "REGISTRATION FEE", amount: 50 }];
  if (Math.random() < 0.4) items.push({ name: "Deworming (Free)", amount: 0 });
  if (Math.random() < 0.3) items.push({ name: "Anti-Rabies Vaccination (Free)", amount: 0 });
  const total = items.reduce((s, it) => s + it.amount, 0);
  await db.query(
    `INSERT INTO outreach_transactions
       (id, outreach_id, qr_token, qr_image_path, pet_owner_id, pet_id, owner_name, owner_contact,
        pet_name, barangay, service_date, service_time, total_amount, status,
        submitted_at, verified_at, verified_by, rejection_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      REF.maxOutTx, programId, qrToken, imagePath,
      ownerSnap.ownerId, ownerSnap.petId, ownerSnap.ownerName, ownerSnap.ownerContact,
      ownerSnap.petName, ownerSnap.barangay,
      SQL_DT(programDate),
      `${String(randInt(8, 16)).padStart(2, "0")}:${String(randInt(0, 59)).padStart(2, "0")}:00`,
      total, status,
      SQL_TS(addDays(programDate, -randInt(1, 3))),
      status === "Verified" ? SQL_TS(programDate) : null,
      status === "Verified" ? staffId : null,
      status === "Rejected" ? "Owner did not show up for the scheduled slot." : null,
    ]
  );
  for (const it of items) {
    await db.query(
      "INSERT INTO outreach_transaction_items (transaction_id, service_name, amount) VALUES (?, ?, ?)",
      [REF.maxOutTx, it.name, it.amount]
    );
  }
}

async function insertAudit({ userId, staffName, action, entityType, entityId, description, at }) {
  await db.query(
    `INSERT INTO audit_logs (user_id, staff_name, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, description, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, '127.0.0.1', 'seed-script', ?, ?)`,
    [userId, staffName, action, entityType, entityId, description, SQL_TS(at)]
  );
}

async function insertNotification(userId, title, message, type, link, at) {
  await db.query(
    `INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [userId, title, message, type, link, SQL_TS(at)]
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed() {
  const t0 = Date.now();
  await loadReference();

  const pool = db;
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  db = conn;
  TXN = conn;

  console.log(
    `Seeding ${NEW_OWNERS} owners + ${EXTRA_PETS} extra pets → ~${390 + NEW_OWNERS + EXTRA_PETS} total pets\n`
  );

  const newPeople = [];

  // 1) Extra staff / veterinarian ------------------------------------------
  const extraUsers = [
    { email: "andrea.ramos@cityvet.gov.ph", role: "Veterinarian", fullName: "Dr. Andrea Ramos" },
    { email: "jenna.pineda@cityvet.gov.ph", role: "Staff", fullName: "Jenna Pineda" },
    { email: "carlo.salvador@cityvet.gov.ph", role: "Staff", fullName: "Carlo Salvador" },
  ];
  for (const eu of extraUsers) {
    const [exists] = await db.query("SELECT id FROM users WHERE email = ?", [eu.email]);
    if (!exists.length) {
      const id = await insertUser(eu.email, eu.role, eu.fullName, addDays(TODAY, -30));
      if (eu.role === "Veterinarian") REF.vetIds.push(id);
      else REF.staffIds.push(id);
      console.log(`  + user ${eu.email} (${eu.role})`);
    }
  }

  // 2) Bulk owners -----------------------------------------------------------
  for (let i = 0; i < NEW_OWNERS; i++) {
    const barangay = BARANGAY_POOL[i];
    const fullName = randFullName();
    const createdAt = addDays(TODAY, -randInt(1, 540));
    const email = `${slug(fullName.split(" ")[0])}.${slug(fullName.split(" ").pop())}${i + 1000}@gmail.com`;

    const userId = await insertUser(email, "Owner", fullName, createdAt);
    const ownerId = await insertOwner(userId, {
      full_name: fullName,
      contact_number: randPhone(),
      address: randAddress(barangay),
      barangay,
      emergency_contact_name: randFullName(),
      emergency_contact_number: randPhone(),
      created_at: createdAt,
    });
    await insertOwnerLocation(ownerId, randLocation(), createdAt);

    newPeople.push({ ownerId, userId, fullName, barangay, createdAt });

    if (i % 100 === 0 && i > 0) console.log(`  .. ${i}/${NEW_OWNERS} owners`);
  }
  console.log(`  .. ${NEW_OWNERS} owners inserted`);

  // 3) Pets: one per new owner + extras on existing owners -------------------
  const [exRows] = await db.query(
    "SELECT id, full_name, barangay FROM pet_owners ORDER BY RAND() LIMIT ?",
    [EXTRA_PETS]
  );
  const extraOwners = exRows.map((e) => ({
    ownerId: e.id,
    fullName: e.full_name,
    barangay: e.barangay,
    createdAt: addDays(TODAY, -200),
    userId: null,
  }));

  const petInfos = [];
  let petCount = 0;
  const rounds = [newPeople, extraOwners];
  for (let round = 0; round < rounds.length; round++) {
    for (const owner of rounds[round]) {
      const pet = makePet(owner.ownerId, { recent: round === 1 && Math.random() < 0.3 });
      const { petId, petCode, pet: saved } = await insertPet(pet);
      petInfos.push({ petId, petCode, pet: saved, owner });
      petCount++;
    }
  }
  console.log(`  .. inserted ${petCount} pets → total ~${390 + petCount}`);

  // 4) Vaccinations ----------------------------------------------------------
  let vacCount = 0;
  for (const pi of petInfos) {
    const recs = vaccinatePet(pi.pet, pi.petId);
    if (recs.length) {
      await insertVaccinations(recs);
      vacCount += recs.length;
    }
  }
  console.log(`  .. ${vacCount} vaccination records`);

  // 5) Clinical records ------------------------------------------------------
  let conCount = 0, rxCount = 0, prevCount = 0, procCount = 0;
  for (const pi of petInfos) {
    if (Math.random() < 0.34) {
      const c = await insertConsultation(pi.petId, pi.pet.speciesId);
      conCount++;
      if (Math.random() < 0.6) {
        await insertPrescription(c.id, c.diagnosis, c.cDate);
        rxCount++;
      }
    }
    if (Math.random() < 0.25) {
      await insertPreventiveCare(pi.petId);
      prevCount++;
    }
    if (Math.random() < 0.12) {
      await insertProcedure(pi.petId);
      procCount++;
    }
  }
  console.log(
    `  .. ${conCount} consultations, ${rxCount} prescriptions as rx, ${prevCount} preventive care, ${procCount} procedures`
  );

  // 6) Payments ---------------------------------------------------------------
  const staffId = randPick(REF.staffIds);
  let orCount = 0, pmCount = 0;
  const paymentPool = petInfos.slice(0, Math.min(petInfos.length, 260));
  for (const pi of paymentPool) {
    if (Math.random() < 0.7) continue;
    const type = randPick(["Consultation", "Vaccination", "Medicine"]);
    const amount = type === "Consultation" ? 250 : type === "Vaccination" ? 300 : 150;
    const items = [{ petId: pi.petId, typeId: REF.payTypes[type], amount }];
    if (Math.random() < 0.25) {
      const t2 = randPick(["Medicine", "Vaccination"]);
      items.push({ petId: pi.petId, typeId: REF.payTypes[t2], amount: t2 === "Vaccination" ? 300 : 150 });
    }
    await insertOfficialReceipt(pi.owner.ownerId, items, staffId);
    orCount++;
  }
  for (let i = 0; i < 160; i++) {
    const pi = randPick(petInfos);
    await insertPmRecord(staffId, pi.owner.ownerId, pi.pet);
    pmCount++;
  }
  console.log(`  .. ${orCount} official receipts (+payments), ${pmCount} payment monitoring records`);

  // 7) Outreach ---------------------------------------------------------------
  let outCount = 0;
  for (let i = 0; i < 90; i++) {
    const pi = randPick(petInfos);
    const programId = randPick(REF.programs);
    await insertOutreachTx(programId, staffId, {
      ownerId: pi.owner.ownerId,
      petId: pi.petId,
      ownerName: pi.owner.fullName,
      ownerContact: "09170000000",
      petName: pi.pet.name,
      barangay: pi.owner.barangay,
    });
    outCount++;
  }
  console.log(`  .. ${outCount} outreach transactions`);

  // 8) Record requests ----------------------------------------------------------
  let reqCount = 0;
  for (let i = 0; i < 70; i++) {
    const pi = randPick(petInfos);
    await insertRecordRequest(pi.owner.ownerId, pi.petId);
    reqCount++;
  }
  console.log(`  .. ${reqCount} record requests`);

  // 9) Announcements -------------------------------------------------------------
  const anns = [
    ["Free Anti-Rabies Vaccination Drive at Casile", "The City Veterinary Office will hold a free anti-rabies vaccination drive at Brgy. Casile. Walk-ins are welcome. Please bring your pet's records.", "All", 3],
    ["Barangay Level Outreach: Banlic", "A free deworming and vaccination outreach will be conducted at Banlic. Pre-registration via QR is required.", "Owner", 3],
    ["Clinic Schedule Reminder", "Reminder that the City Veterinary Clinic observes a half-day schedule every first Monday of the month for inventory and maintenance.", "All", 0],
    ["Pet Registration Renewal Opening", "Annual pet registration renewal is now open. Owners can update their pet records online to stay compliant with the barangay ordinance.", "Owner", 2],
    ["Staff Bulletin: Digital Check-in Update", "Staff are reminded to use the digital check-in upon arrival. Check-in logs are recorded in the activity audit trail.", "Staff", 1],
    ["Rabies Awareness Seminar", "In partnership with the Department of Health, a free rabies awareness seminar will be held at the City Hall. Pet owners are encouraged to attend.", "Owner", 2],
  ];
  for (const [title, message, audience, daysAgo] of anns) {
    const sent = addDays(TODAY, -daysAgo);
    await db.query(
      `INSERT INTO announcements (title, message, audience, scheduled_at, is_sent, sent_at, created_by)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [title, message, audience, SQL_TS(sent), SQL_TS(sent), staffId]
    );
  }
  console.log(`  .. ${anns.length} announcements`);

  // 10) Drafts ---------------------------------------------------------------------
  for (let i = 0; i < 15; i++) {
    const owner = randPick(newPeople);
    const speciesId = Math.random() < 0.65 ? REF.species.Dog : REF.species.Cat;
    const dname = speciesId === REF.species.Dog ? randPick(DOG_NAMES) : randPick(CAT_NAMES);
    const payload = {
      name: dname,
      species_id: speciesId,
      sex: Math.random() < 0.5 ? "Male" : "Female",
      color: randPick(COLORS),
      birthdate: iso(addDays(TODAY, -randInt(120, 1800))),
      additional_notes: randPick(["Waiting for photo upload", "Imported from phone", "Will visit the clinic to confirm", ""]),
    };
    await db.query(
      `INSERT INTO draft_registrations (pet_owner_id, temp_reg_info, device_id, payload, sync_state, sync_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        owner.ownerId,
        JSON.stringify(payload),
        `device-${randInt(1000, 9999)}`,
        JSON.stringify(payload),
        randPick(["Draft", "Pending Sync", "Synced"]),
        SQL_TS(addDays(TODAY, -randInt(0, 5))),
      ]
    );
  }
  console.log(`  .. 15 draft registrations`);

  // 11) Notifications ---------------------------------------------------------
  let notifCount = 0;
  for (const owner of newPeople) {
    const t = addDays(TODAY, -randInt(0, 20));
    await insertNotification(
      owner.userId, "Pet Registration Approved",
      "Your pet registration has been verified and a QR pet ID is now available in your records.",
      "Registration", "/owner/my-pets", t
    );
    notifCount++;
    if (Math.random() < 0.55) {
      await insertNotification(
        owner.userId, "Vaccination Reminder",
        "Your pet's vaccination may be due soon. Please check your vaccination history.",
        "Vaccination", "/owner/vaccination-history", addDays(t, 1)
      );
      notifCount++;
    }
    if (Math.random() < 0.3) {
      await insertNotification(
        owner.userId, "New Announcement",
        "Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.",
        "Announcement", "/owner/announcements", addDays(t, 2)
      );
      notifCount++;
    }
  }
  console.log(`  .. ${notifCount} notifications`);

  // 12) Audit logs -----------------------------------------------------------
  let auditCount = 0;
  const staffNames = ["Rex Abad", "Jenna Pineda", "Carlo Salvador", "Mark Lawrence"];
  for (const pi of petInfos) {
    if (pi.pet.status !== "Verified") continue;
    await insertAudit({
      userId: staffId,
      staffName: randPick(staffNames),
      action: "PET_REGISTERED",
      entityType: "Pet",
      entityId: pi.petId,
      description: `Registered and verified pet "${pi.pet.name}" (${pi.petCode})`,
      at: new Date(pi.pet.registration_date),
    });
    auditCount++;
  }
  for (let i = 0; i < 40; i++) {
    const person = randPick(newPeople);
    await insertAudit({
      userId: staffId,
      staffName: randPick(staffNames),
      action: "STAFF_CHECK_IN",
      entityType: "Staff",
      entityId: person.ownerId,
      description: `Staff member checked in for the ${randInt(7, 9)} AM shift`,
      at: addDays(TODAY, -randInt(0, 20)),
    });
    auditCount++;
  }
  console.log(`  .. ${auditCount} audit log entries`);

  // 13) Marker + summary -----------------------------------------------------
  await db.query(
    `INSERT INTO users (email, password, role, status, full_name, created_at)
     VALUES (?, ?, 'Admin', 'active', 'Bulk Seed Marker', NOW())
     ON DUPLICATE KEY UPDATE email = email`,
    [MARKER_EMAIL, nextHash()]
  );

  const [[totals]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM pet_owners) AS owners,
       (SELECT COUNT(*) FROM pets) AS pets,
       (SELECT COUNT(*) FROM qr_codes) AS qr,
       (SELECT COUNT(*) FROM vaccination_records) AS vax,
       (SELECT COUNT(*) FROM consultation_records) AS cons,
       (SELECT COUNT(*) FROM prescriptions) AS rx,
       (SELECT COUNT(*) FROM prescription_items) AS rxi,
       (SELECT COUNT(*) FROM preventive_care_records) AS pvc,
       (SELECT COUNT(*) FROM pet_procedures) AS proc,
       (SELECT COUNT(*) FROM payments) AS pays,
       (SELECT COUNT(*) FROM payment_monitoring) AS pm,
       (SELECT COUNT(*) FROM official_receipts) AS orc,
       (SELECT COUNT(*) FROM record_requests) AS rr,
       (SELECT COUNT(*) FROM outreach_transactions) AS ot,
       (SELECT COUNT(*) FROM announcements) AS ann,
       (SELECT COUNT(*) FROM draft_registrations) AS drf,
       (SELECT COUNT(*) FROM notifications) AS notif,
       (SELECT COUNT(*) FROM audit_logs) AS audit,
       (SELECT COUNT(*) FROM owner_locations) AS loc`
  );
  console.log("\n===== SEED COMPLETE =====");
  console.log(`pet_owners: ${totals.owners}`);
  console.log(`pets: ${totals.pets}`);
  console.log(`qr_codes: ${totals.qr}`);
  console.log(`vaccination_records: ${totals.vax}`);
  console.log(`consultation_records: ${totals.cons}`);
  console.log(`prescriptions: ${totals.rx} (items: ${totals.rxi})`);
  console.log(`preventive_care_records: ${totals.pvc}`);
  console.log(`pet_procedures: ${totals.proc}`);
  console.log(`payments: ${totals.pays}`);
  console.log(`payment_monitoring: ${totals.pm}`);
  console.log(`official_receipts: ${totals.orc}`);
  console.log(`record_requests: ${totals.rr}`);
  console.log(`outreach_transactions: ${totals.ot}`);
  console.log(`announcements: ${totals.ann}`);
  console.log(`draft_registrations: ${totals.drf}`);
  console.log(`notifications: ${totals.notif}`);
  console.log(`audit_logs: ${totals.audit}`);
  console.log(`owner_locations: ${totals.loc}`);
  console.log(`\nNew account password: ${PASSWORD}`);
  console.log(
    `New accounts: andrea.ramos@cityvet.gov.ph (Vet), jenna.pineda@cityvet.gov.ph (Staff), carlo.salvador@cityvet.gov.ph (Staff) + ${NEW_OWNERS} owner accounts`
  );
  console.log(`Elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  await conn.commit();
  TXN = null;
  conn.release();
  process.exit(0);
}

seed().catch(async (err) => {
  if (TXN) {
    try {
      await TXN.rollback();
    } catch {}
    try {
      TXN.release();
    } catch {}
  }
  console.error("Seeding failed:", err);
  process.exit(1);
});