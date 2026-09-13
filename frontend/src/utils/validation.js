import {
  ALL_CABUYAO_BARANGAYS,
  CABUYAO_BARANGAYS,
  CABUYAO_POB_BARANGAYS,
} from '../data/cabuyaoBarangays';

export { ALL_CABUYAO_BARANGAYS, CABUYAO_BARANGAYS, CABUYAO_POB_BARANGAYS };

export const REQUEST_TYPES = ['Vaccination Card', 'Record Summary', 'Certificate of Registration'];
export const REQUEST_FORMATS = ['PDF', 'Printed Copy'];
export const STAFF_ROLES = ['Staff', 'Veterinarian', 'Admin'];

export function trim(value) {
  return typeof value === 'string' ? value.trim() : value;
}

export function getPasswordChecks(password = '') {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function isValidPassword(password) {
  return Object.values(getPasswordChecks(password || '')).every(Boolean);
}

export function getPasswordError(password) {
  if (!password) return 'Password is required.';
  const checks = getPasswordChecks(password);
  if (!checks.minLength) return 'Password must be at least 8 characters.';
  if (!checks.uppercase) return 'Password must include at least one uppercase letter.';
  if (!checks.lowercase) return 'Password must include at least one lowercase letter.';
  if (!checks.number) return 'Password must include at least one number.';
  if (!checks.special) return 'Password must include at least one special character.';
  return null;
}

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const value = email.trim();
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getFullNameError(name) {
  const value = trim(name);

  if (!value) return 'Full name is required.';
  if (value.length > 100) return 'Full name must be 100 characters or less.';
  if (/[0-9]/.test(value)) return 'Full name cannot contain numbers.';
  if (/[^A-Za-z\s.'-]/.test(value)) {
    return 'Full name can only contain letters, spaces, hyphens, and apostrophes.';
  }

  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return 'Enter your full name with first name and last name.';
  if (parts.some((part) => part.length < 2)) {
    return 'Each name must be at least 2 letters.';
  }

  return null;
}

export function isValidFullName(name) {
  return getFullNameError(name) === null;
}

export function isValidPhonePH(phone) {
  if (!phone) return true;
  const cleaned = String(phone).replace(/[\s-]/g, '');
  return /^(09\d{9}|\+639\d{9})$/.test(cleaned);
}

export function getPhoneError(phone, required = false) {
  if (!phone) return required ? 'Contact number is required.' : null;
  return isValidPhonePH(phone) ? null : 'Enter a valid PH mobile number (09XXXXXXXXX).';
}

export function isValidBarangay(barangay) {
  return ALL_CABUYAO_BARANGAYS.includes(trim(barangay));
}

export function isValidOtp(otp) {
  return /^\d{6}$/.test(String(otp || '').trim());
}

export function isValidOrNumber(orNumber) {
  const value = trim(orNumber);
  return value && /^[A-Za-z0-9-]{3,30}$/.test(value);
}

export function isValidAmount(amount, { required = false } = {}) {
  if (amount === null || amount === undefined || amount === '') {
    return !required;
  }
  const num = Number(amount);
  return !Number.isNaN(num) && num > 0 && num <= 9999999.99;
}

export function isValidDate(value) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

export function isDateNotFuture(value) {
  if (!isValidDate(value)) return false;
  const date = new Date(value);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}

export function isDateOnOrAfter(startDate, endDate) {
  if (!startDate || !endDate) return true;
  return new Date(endDate) >= new Date(startDate);
}

function buildResult(errors, fallbackMessage = 'Please correct the highlighted fields.') {
  const firstError = Object.values(errors)[0];
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    message: firstError || fallbackMessage,
  };
}

export function validateOwnerRegistration(data) {
  const errors = {};
  const fullNameError = getFullNameError(data.full_name);
  if (fullNameError) errors.full_name = fullNameError;
  if (!isValidEmail(data.email)) errors.email = 'Enter a valid email address.';
  const passwordError = getPasswordError(data.password);
  if (passwordError) errors.password = passwordError;
  const phoneError = getPhoneError(trim(data.contact_number));
  if (phoneError) errors.contact_number = phoneError;
  if (!isValidBarangay(data.barangay)) errors.barangay = 'Select a valid barangay in Cabuyao.';
  return buildResult(errors);
}

export function validateStaffUserCreation(data) {
  const errors = {};
  const fullNameError = getFullNameError(data.full_name);
  if (fullNameError) errors.full_name = fullNameError;
  if (!isValidEmail(data.email)) errors.email = 'Enter a valid email address.';
  const passwordError = getPasswordError(data.password);
  if (passwordError) errors.password = passwordError;
  if (!STAFF_ROLES.includes(trim(data.role_name))) errors.role_name = 'Select a valid role.';
  return buildResult(errors);
}

export function validateResetPassword(data) {
  const errors = {};
  if (!isValidEmail(data.email)) errors.email = 'Enter a valid email address.';
  if (!isValidOtp(data.otp)) errors.otp = 'Enter the 6-digit OTP code from your email.';
  const passwordError = getPasswordError(data.password);
  if (passwordError) errors.password = passwordError;
  if (data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return buildResult(errors);
}

const PET_TEXT_PATTERN = /^[A-Za-z\s.'\-,/]*$/;

export function getPetNameError(name) {
  const value = trim(name);

  if (!value) return 'Pet name is required.';
  if (value.length < 2) return 'Pet name must be at least 2 characters.';
  if (/[0-9]/.test(value)) return 'No numbers should be included.';
  if (!/[A-Za-z]/.test(value)) return 'Pet name must contain letters.';
  if (!PET_TEXT_PATTERN.test(value)) {
    return 'Pet name can only contain letters, spaces, hyphens, and apostrophes.';
  }

  return null;
}

export function getPetColorError(color) {
  const value = trim(color);

  if (!value) return null;
  if (/[0-9]/.test(value)) return 'No numbers should be included.';
  if (!/[A-Za-z]/.test(value)) return 'Color must contain letters.';
  if (!PET_TEXT_PATTERN.test(value)) {
    return 'Color can only contain letters, spaces, hyphens, and apostrophes.';
  }

  return null;
}

export function validatePetRegistration(data) {
  const errors = {};
  const nameError = getPetNameError(data.name);
  if (nameError) errors.name = nameError;
  const colorError = getPetColorError(data.color);
  if (colorError) errors.color = colorError;
  if (!data.species_id) errors.species_id = 'Species is required.';
  if (data.breed_id === 'other' && !trim(data.breed_other)) {
    errors.breed_other = 'Please specify your pet\'s breed.';
  }
  if (data.birthdate && !isDateNotFuture(data.birthdate)) {
    errors.birthdate = 'Birthdate cannot be in the future.';
  }
  return buildResult(errors);
}

export function validateClinicalRecord(data) {
  const errors = {};
  if (!data.pet_id) errors.pet_id = 'Select a pet.';
  if (!isValidDate(data.consultation_date)) errors.consultation_date = 'Consultation date is required.';
  if (data.consultation_date && !isDateNotFuture(data.consultation_date)) {
    errors.consultation_date = 'Consultation date cannot be in the future.';
  }
  if (data.follow_up_date && data.consultation_date && !isDateOnOrAfter(data.consultation_date, data.follow_up_date)) {
    errors.follow_up_date = 'Follow-up date must be on or after the consultation date.';
  }
  return buildResult(errors);
}

export function validateVaccinationRecord(data) {
  const errors = {};
  if (!data.pet_id) errors.pet_id = 'Select a pet.';
  if (!data.vaccine_id) errors.vaccine_id = 'Select a vaccine.';
  if (!isValidDate(data.date_administered)) errors.date_administered = 'Date administered is required.';
  if (data.date_administered && !isDateNotFuture(data.date_administered)) {
    errors.date_administered = 'Date administered cannot be in the future.';
  }
  if (data.next_due_date && data.date_administered && !isDateOnOrAfter(data.date_administered, data.next_due_date)) {
    errors.next_due_date = 'Next due date must be on or after the date administered.';
  }
  return buildResult(errors);
}

export function validatePrescription(data) {
  const errors = {};
  if (!data.pet_id) errors.pet_id = 'Select a pet.';
  if (!data.medicine_id) errors.medicine_id = 'Select a medicine.';
  return buildResult(errors);
}

export function validateRecordRequest(data) {
  const errors = {};
  if (!data.pet_id) errors.pet_id = 'Select a pet.';
  if (!REQUEST_TYPES.includes(trim(data.request_type))) errors.request_type = 'Select a valid request type.';
  if (data.format && !REQUEST_FORMATS.includes(trim(data.format))) errors.format = 'Select a valid format.';
  return buildResult(errors);
}
