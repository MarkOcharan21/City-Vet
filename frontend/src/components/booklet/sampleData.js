export const AVATAR_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='300' height='300' fill='#F1F5F9'/><text x='150' y='185' font-size='150' text-anchor='middle'>🐾</text></svg>",
  );

export const QR_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><rect width='240' height='240' fill='#ffffff'/><rect x='12' y='12' width='56' height='56' fill='#111827'/><rect x='172' y='12' width='56' height='56' fill='#111827'/><rect x='12' y='172' width='56' height='56' fill='#111827'/><path d='M84 12h16M116 12h16M148 12h16M84 52h16M148 52h16M84 100h8M104 92v16M116 100h8M136 100h8M156 92v16M84 128h16M148 128h16M84 148h16M148 148h16M84 172h16M104 172h16M84 196h16M104 196h16M148 172h16M148 196h16M172 92v16M196 92v16M176 128h16M196 148v16M172 196v16M196 196h12' stroke='#111827' stroke-width='8'/></svg>",
  );

function pickPet(pet) {
  const base = pet || {};
  return {
    ...base,
    // Only fill fields with neutral placeholders — never fabricated data.
    name: base.name || "Unnamed Pet",
    pet_code: base.pet_code || "—",
    species_name: base.species_name || "—",
    breed_name: base.breed_name || "—",
    sex: base.sex || "—",
    color: base.color || "—",
    registration_date: base.registration_date || null,
    status: base.status || "Registered",
    full_name: base.full_name || base.owner_name || "—",
    contact_number: base.contact_number || null,
    address: base.address || null,
    barangay: base.barangay || null,
  };
}

export function enrichBooklet(data, mode) {
  const pet = pickPet(data?.pet);
  const authorized = mode === "owner";

  // Use ONLY real backend data. Sample/demo records must never be shown in
  // an official booklet — sections with no data render as empty states.
  const vaccinations = (Array.isArray(data?.vaccinations) ? data.vaccinations : []).map(withStaffName);
  const consultations = (Array.isArray(data?.consultations) ? data.consultations : []).map(withVetName);
  const prescriptions = Array.isArray(data?.prescriptions) ? data.prescriptions : [];
  const payments = authorized
    ? (Array.isArray(data?.payments) ? data.payments : [])
    : [];

  return {
    authorized,
    pet,
    vaccinations,
    consultations,
    prescriptions,
    payments,
    preventiveCare: Array.isArray(data?.preventiveCare) ? data.preventiveCare : [],
    procedures: Array.isArray(data?.procedures) ? data.procedures : [],
    stamps: buildStamps(pet, vaccinations, consultations, payments),
    emergency: {
      owner_name: pet.full_name,
      owner_contact: pet.contact_number,
      emergency_contact_name: pet.emergency_contact_name || "",
      emergency_contact_number: pet.emergency_contact_number || "",
      allergies: parseList(pet.allergies),
      current_medication: parseList(pet.current_medication),
      conditions: parseList(pet.important_conditions),
      special_instructions: pet.special_instructions || "",
    },
    location: { sharing_enabled: false, barangay: pet.barangay },
    careGuide: DEFAULT_CARE_GUIDE,
  };
}

// Pet-level medical flags are stored as comma-separated strings.
function parseList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function withStaffName(record) {
  return { ...record, staff_name: record.staff_name || "City Vet Staff" };
}

function withVetName(record) {
  return {
    ...record,
    veterinarian: record.veterinarian || "City Vet Staff",
  };
}

function buildStamps(pet, vaccinations, consultations, payments) {
  const stamps = [];
  const times = ["08:45 AM", "10:15 AM", "01:30 PM", "03:05 PM", "09:20 AM", "11:40 AM", "02:15 PM", "04:50 PM"];

  if (pet.status === "Verified") {
    stamps.push({
      date: pet.registration_date,
      time: "09:00 AM",
      transaction: "Registration — Pet Registered & Verified",
      verified_by: "City Veterinary Office",
    });
  }

  for (const v of vaccinations) {
    stamps.push({
      date: v.date_administered,
      time: times[stamps.length % times.length],
      transaction: `Vaccination — ${v.vaccine_name}`,
      verified_by: v.staff_name || "City Vet Staff",
    });
  }

  for (const c of consultations) {
    stamps.push({
      date: c.consultation_date,
      time: times[stamps.length % times.length],
      transaction: `Consultation — ${c.diagnosis || "Veterinary Consultation"}`,
      verified_by: c.veterinarian || "City Vet Staff",
    });
  }

  for (const p of payments) {
    if (p.validation_status === "Verified" || p.payment_status === "Paid") {
      stamps.push({
        date: p.payment_date,
        time: times[stamps.length % times.length],
        transaction: `Payment Verified — ${p.type_name || "Official Receipt"}`,
        verified_by: "City Vet Staff",
      });
    }
  }

  return stamps;
}

export const DEFAULT_CARE_GUIDE = [
  {
    icon: "syringe",
    title: "Vaccination Reminders",
    text: "Keep your pet's vaccinations updated. Rabies boosters are recommended yearly, or as advised by your veterinarian.",
  },
  {
    icon: "shield",
    title: "Deworming",
    text: "Deworm adult dogs and cats every 3 months, and puppies/kittens every 2 weeks until 3 months of age.",
  },
  {
    icon: "bowl",
    title: "Proper Nutrition",
    text: "Feed a balanced diet suited to your pet's age, size, and activity. Always provide clean drinking water.",
  },
  {
    icon: "heart",
    title: "Responsible Pet Ownership",
    text: "Register your pet, keep them on a leash or within your yard, and clean up after them in public places.",
  },
  {
    icon: "alert",
    title: "Rabies Prevention",
    text: "Rabies is fatal but preventable. Vaccinate your pet and avoid contact with stray or unvaccinated animals.",
  },
  {
    icon: "paw",
    title: "Basic Pet Care",
    text: "Groom, bathe, and check your pet regularly. Trim nails, brush teeth, and inspect ears to catch problems early.",
  },
  {
    icon: "stethoscope",
    title: "When to Consult a Veterinarian",
    text: "Consult immediately if your pet shows lethargy, loss of appetite, vomiting, diarrhea, difficulty breathing, or unusual behavior.",
  },
  {
    icon: "phone",
    title: "Emergency Reminders",
    text: "Keep your nearest veterinary clinic's number accessible. Do not self-medicate your pet without veterinary advice.",
  },
];