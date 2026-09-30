import { ShieldAlert, Syringe, HeartPulse } from "lucide-react";

// Shared display helpers for the consultation workspace and the consultation log.
// Both pages render the same pet roster, so the age/flag formatting lives here
// instead of drifting between the two.

export function hasValue(value) {
  return value != null && String(value).trim() !== "";
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

// Mirrors the pet-records listing so both tables read the same way.
export function formatAge(birthdate) {
  if (!hasValue(birthdate)) return null;
  const born = new Date(birthdate);
  if (Number.isNaN(born.getTime())) return null;

  const months = (Date.now() - born.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months < 0) return null;
  if (months < 12) return `${Math.floor(months)} mo`;

  const years = Math.floor(months / 12);
  const rest = Math.floor(months % 12);
  return rest ? `${years}y ${rest}m` : `${years}y`;
}

export function healthFlags(pet) {
  if (!pet) return [];
  const flags = [];
  if (hasValue(pet.allergies)) {
    flags.push({ key: "allergies", label: pet.allergies, tone: "danger", Icon: ShieldAlert });
  }
  if (hasValue(pet.current_medication)) {
    flags.push({ key: "medication", label: pet.current_medication, tone: "warn", Icon: Syringe });
  }
  if (hasValue(pet.important_conditions)) {
    flags.push({ key: "conditions", label: pet.important_conditions, tone: "warn", Icon: HeartPulse });
  }
  return flags;
}

export function flagLabel(key) {
  if (key === "allergies") return "Allergy";
  if (key === "medication") return "Medication";
  return "Condition";
}
