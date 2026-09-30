/**
 * Dosing helpers for the consultation workspace's medicine section.
 *
 * The base regimen for each medicine lives on its row in the `medicines` table
 * (see ensureMedicineDosingColumns in backend/server.js). The consultation's
 * diagnosis then adjusts the course length, so a severe or recurring case gets
 * a longer course than a mild one.
 *
 * Every value produced here is a suggestion. The veterinarian can edit any
 * field, and the reason a course was chosen is surfaced next to the input.
 */

export const DOSAGE_CHIPS = ['1 tablet', '1/2 tablet', '1 mL', '2 mL', '1 sachet', '2 sprays'];
export const FREQUENCY_CHIPS = ['Once daily', 'Twice daily', 'Every 8 hours', 'Once'];
export const DURATION_CHIPS = ['3 days', '5 days', '7 days', '14 days', 'Single dose'];

export function emptyPrescriptionItem() {
  return {
    medicine_id: '',
    quantity: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    // UI-only. Records which fields the vet edited by hand, so a later
    // diagnosis change can refresh the ones still holding a suggested value.
    // The submit handler whitelists the six real fields, so this never
    // reaches the API.
    touched: {},
  };
}

/** Maps a free-text frequency to a number of doses per day. */
export function parseFrequencyPerDay(frequency) {
  const text = (frequency || '').toLowerCase();
  if (!text) return null;
  if (text.includes('every 4 hours')) return 6;
  if (text.includes('every 6 hours')) return 4;
  if (text.includes('every 8 hours')) return 3;
  if (text.includes('every 12 hours')) return 2;
  if (text.includes('thrice') || text.includes('3x')) return 3;
  if (text.includes('twice') || text.includes('2x')) return 2;
  if (text.includes('once') || text.includes('daily')) return 1;
  return null;
}

/** Maps a free-text duration to a number of days, or null if it has no length. */
export function parseDurationDays(duration) {
  const text = (duration || '').toLowerCase();
  if (!text) return null;
  const dayMatch = text.match(/(\d+)\s*day/);
  if (dayMatch) return Number(dayMatch[1]);
  const weekMatch = text.match(/(\d+)\s*week/);
  if (weekMatch) return Number(weekMatch[1]) * 7;
  return null;
}

/**
 * Dosage × doses-per-day × days. Weight-based dosages are skipped because the
 * app has no weight field to compute them from, and a wrong total would be
 * worse than no suggestion.
 */
export function getQuantitySuggestion(item) {
  const dosage = (item.dosage || '').trim();
  if (/per\s*(kg|lb|body)/i.test(dosage)) return null;

  const unitMatch = dosage.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\b/);
  if (!unitMatch) return null;

  const units = Number(unitMatch[1]);
  const unit = unitMatch[2].toLowerCase();
  const perDay = parseFrequencyPerDay(item.frequency);
  const days = parseDurationDays(item.duration);
  if (!units || !perDay || !days) return null;

  const total = Math.ceil(units * perDay * days);
  if (!total || total <= 0) return null;

  const plural = total > 1 && !unit.endsWith('s') ? `${unit}s` : unit;
  return `${total} ${plural}`;
}

// A course length is a clinical decision, so the diagnosis only stretches or
// shortens the medicine's own default. "Single dose" and "Monthly" have no
// meaningful day count and are left exactly as the medicine defines them.
const EXTENDED_KEYWORDS = ['severe', 'chronic', 'recurring', 'advanced', 'worsening', 'unresponsive', 'intense'];
const MILD_KEYWORDS = ['mild', 'early', 'minor', 'slight', 'mild case'];

/**
 * Classifies the consultation's diagnosis into a course profile.
 * Returns { key, label, reason, multiplier }.
 */
export function classifyCourse(diagnosisText) {
  const text = (diagnosisText || '').toLowerCase();
  if (!text.trim()) {
    return { key: 'standard', label: 'Standard course', reason: 'No diagnosis written yet - using the medicine default.', multiplier: 1 };
  }

  const extended = EXTENDED_KEYWORDS.find((word) => text.includes(word));
  if (extended) {
    return {
      key: 'extended',
      label: 'Extended course',
      reason: `Diagnosis mentions "${extended}", so the course was stretched.`,
      multiplier: 1.5,
    };
  }

  const mild = MILD_KEYWORDS.find((word) => text.includes(word));
  if (mild) {
    return {
      key: 'mild',
      label: 'Shorter course',
      reason: `Diagnosis mentions "${mild}", so the course was shortened.`,
      multiplier: 0.6,
    };
  }

  return {
    key: 'standard',
    label: 'Standard course',
    reason: 'Diagnosis does not flag the case as mild or severe - using the medicine default.',
    multiplier: 1,
  };
}

/** Applies a course multiplier to a duration string, leaving unit-less ones alone. */
export function scaleDuration(duration, multiplier) {
  if (multiplier === 1) return duration;

  const days = parseDurationDays(duration);
  if (!days) return duration;

  // Never round a course down to nothing, and never invent a day count for a
  // regimen the medicine defines as single-dose or monthly.
  const scaled = Math.max(1, Math.round(days * multiplier));
  if (scaled === days) return duration;
  return `${scaled} days`;
}

/**
 * Builds the suggested regimen for a medicine under the current diagnosis.
 * Returns null when the medicine has no defaults stored.
 */
export function buildRegimen(medicine, diagnosisText) {
  if (!medicine) return null;

  const dosage = medicine.default_dosage || '';
  const frequency = medicine.default_frequency || '';
  const duration = medicine.default_duration || '';
  if (!dosage && !frequency && !duration) return null;

  const course = classifyCourse(diagnosisText);
  const adjustedDuration = scaleDuration(duration, course.multiplier);
  const wasAdjusted = adjustedDuration !== duration;

  const regimen = {
    dosage,
    frequency,
    duration: adjustedDuration,
    instructions: medicine.default_instructions || '',
    course: wasAdjusted ? course : null,
  };

  const quantity = getQuantitySuggestion(regimen);
  if (quantity) regimen.quantity = quantity;

  return regimen;
}

/**
 * Refreshes suggested values after the consultation's diagnosis changed.
 *
 * Only fields the vet has not edited by hand are rewritten, so dosing can keep
 * up with the diagnosis without ever overwriting a deliberate decision. Quantity
 * is derived from dosage x frequency x duration, so it is recomputed only when
 * all three of those are still untouched and the vet has not set their own
 * quantity either.
 */
export function rederivePrescription(items, diagnosisText, medicines) {
  return items.map((item) => {
    if (!item.medicine_id) return item;

    const medicine = (medicines || []).find((entry) => String(entry.id) === String(item.medicine_id));
    const regimen = buildRegimen(medicine, diagnosisText);
    if (!regimen) return item;

    const touched = item.touched || {};
    const next = { ...item };
    if (!touched.dosage) next.dosage = regimen.dosage;
    if (!touched.frequency) next.frequency = regimen.frequency;
    if (!touched.duration) next.duration = regimen.duration;
    if (!touched.instructions) next.instructions = regimen.instructions;

    const scheduleUntouched = !touched.dosage && !touched.frequency && !touched.duration;
    if (scheduleUntouched && !touched.quantity) {
      const quantity = getQuantitySuggestion(next);
      if (quantity) next.quantity = quantity;
    }

    return next;
  });
}
