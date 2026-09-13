const { CABUYAO_BARANGAYS } = require('../constants/cabuyaoBarangays');

const REQUEST_TYPES = ['Vaccination Card', 'Record Summary', 'Certificate of Registration'];
const REQUEST_FORMATS = ['PDF', 'Printed Copy'];
const PET_SEX_VALUES = ['Male', 'Female'];
const STAFF_ROLES = ['Staff', 'Veterinarian', 'Admin'];
const ANNOUNCEMENT_AUDIENCES = ['All', 'Owner', 'Staff', 'Veterinarian', 'Admin'];

function trim(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function getPasswordChecks(password = '') {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function isValidPassword(password) {
  return Object.values(getPasswordChecks(password || '')).every(Boolean);
}

function getPasswordError(password) {
  if (!password) return 'Password is required.';
  const checks = getPasswordChecks(password);
  if (!checks.minLength) return 'Password must be at least 8 characters.';
  if (!checks.uppercase) return 'Password must include at least one uppercase letter.';
  if (!checks.lowercase) return 'Password must include at least one lowercase letter.';
  if (!checks.number) return 'Password must include at least one number.';
  if (!checks.special) return 'Password must include at least one special character.';
  return null;
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const value = email.trim();
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getFullNameError(name) {
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

function isValidFullName(name) {
  return getFullNameError(name) === null;
}

function isValidPhonePH(phone) {
  if (!phone) return true;
  const cleaned = String(phone).replace(/[\s-]/g, '');
  return /^(09\d{9}|\+639\d{9})$/.test(cleaned);
}

function getPhoneError(phone, required = false) {
  if (!phone) return required ? 'Contact number is required.' : null;
  return isValidPhonePH(phone) ? null : 'Enter a valid PH mobile number (09XXXXXXXXX).';
}

function isValidBarangay(barangay) {
  return CABUYAO_BARANGAYS.includes(trim(barangay));
}

function isValidOtp(otp) {
  return /^\d{6}$/.test(String(otp || '').trim());
}

function isValidOrNumber(orNumber) {
  const value = trim(orNumber);
  return value && /^[A-Za-z0-9-]{3,30}$/.test(value);
}

function isValidAmount(amount, { required = false } = {}) {
  if (amount === null || amount === undefined || amount === '') {
    return !required;
  }
  const num = Number(amount);
  return !Number.isNaN(num) && num > 0 && num <= 9999999.99;
}

function isValidDate(value) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function isDateNotFuture(value) {
  if (!isValidDate(value)) return false;
  const date = new Date(value);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}

function isDateOnOrAfter(startDate, endDate) {
  if (!startDate || !endDate) return true;
  return new Date(endDate) >= new Date(startDate);
}

function isPositiveInt(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
}

function validationError(res, message, errors = null) {
  return res.status(400).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
}

function validateOwnerRegistration(data) {
  const errors = {};
  const full_name = trim(data.full_name);
  const email = trim(data.email);
  const password = data.password || '';
  const contact_number = trim(data.contact_number);
  const barangay = trim(data.barangay);

  if (getFullNameError(full_name)) errors.full_name = getFullNameError(full_name);
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  const passwordError = getPasswordError(password);
  if (passwordError) errors.password = passwordError;
  const phoneError = getPhoneError(contact_number);
  if (phoneError) errors.contact_number = phoneError;
  if (!isValidBarangay(barangay)) errors.barangay = 'Select a valid barangay in Cabuyao.';

  return { valid: Object.keys(errors).length === 0, errors, message: 'Please correct the highlighted fields.' };
}

function validateStaffUserCreation(data) {
  const errors = {};
  const full_name = trim(data.full_name);
  const email = trim(data.email);
  const password = data.password || '';
  const role_name = trim(data.role_name);

  if (getFullNameError(full_name)) errors.full_name = getFullNameError(full_name);
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  const passwordError = getPasswordError(password);
  if (passwordError) errors.password = passwordError;
  if (!STAFF_ROLES.includes(role_name)) errors.role_name = 'Select a valid role.';

  return { valid: Object.keys(errors).length === 0, errors, message: 'Please correct the highlighted fields.' };
}

function validateResetPassword(data) {
  const errors = {};
  const email = trim(data.email);
  const otp = trim(data.otp);
  const password = data.password || '';

  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!isValidOtp(otp)) errors.otp = 'Enter the 6-digit OTP code from your email.';
  const passwordError = getPasswordError(password);
  if (passwordError) errors.password = passwordError;

  return { valid: Object.keys(errors).length === 0, errors, message: 'Please correct the highlighted fields.' };
}

const PET_TEXT_PATTERN = /^[A-Za-z\s.'\-,/]*$/;

function getPetNameError(name) {
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

function getPetColorError(color) {
  const value = trim(color);

  if (!value) return null;
  if (/[0-9]/.test(value)) return 'No numbers should be included.';
  if (!/[A-Za-z]/.test(value)) return 'Color must contain letters.';
  if (!PET_TEXT_PATTERN.test(value)) {
    return 'Color can only contain letters, spaces, hyphens, and apostrophes.';
  }

  return null;
}

function validatePetRegistration(data) {
  const errors = {};
  const species_id = data.species_id;
  const breed_id = data.breed_id;
  const breed_other = trim(data.breed_other);
  const sex = trim(data.sex);
  const birthdate = trim(data.birthdate);

  const nameError = getPetNameError(data.name);
  if (nameError) errors.name = nameError;
  const colorError = getPetColorError(data.color);
  if (colorError) errors.color = colorError;
  if (!species_id) errors.species_id = 'Species is required.';
  if (breed_id === 'other' && !breed_other) errors.breed_other = 'Please specify your pet\'s breed.';
  if (sex && !PET_SEX_VALUES.includes(sex)) errors.sex = 'Select a valid sex.';
  if (birthdate && !isDateNotFuture(birthdate)) errors.birthdate = 'Birthdate cannot be in the future.';

  return { valid: Object.keys(errors).length === 0, errors, message: 'Please correct the highlighted fields.' };
}

function validateClinicalRecord(data) {
  const errors = {};
  if (!isPositiveInt(data.pet_id)) errors.pet_id = 'Select a pet.';
  if (!isValidDate(data.consultation_date)) errors.consultation_date = 'Consultation date is required.';
  if (data.consultation_date && !isDateNotFuture(data.consultation_date)) {
    errors.consultation_date = 'Consultation date cannot be in the future.';
  }
  if (data.follow_up_date && data.consultation_date && !isDateOnOrAfter(data.consultation_date, data.follow_up_date)) {
    errors.follow_up_date = 'Follow-up date must be on or after the consultation date.';
  }

  return { valid: Object.keys(errors).length === 0, errors, message: 'Please correct the highlighted fields.' };
}

function validateVaccinationRecord(data) {
  const errors = {};
  if (!isPositiveInt(data.pet_id)) errors.pet_id = 'Select a pet.';
  if (!isPositiveInt(data.vaccine_id)) errors.vaccine_id = 'Select a vaccine.';
  if (!isValidDate(data.date_administered)) errors.date_administered = 'Date administered is required.';
  if (data.date_administered && !isDateNotFuture(data.date_administered)) {
    errors.date_administered = 'Date administered cannot be in the future.';
  }
  if (data.next_due_date && data.date_administered && !isDateOnOrAfter(data.date_administered, data.next_due_date)) {
    errors.next_due_date = 'Next due date must be on or after the date administered.';
  }

  return { valid: Object.keys(errors).length === 0, errors, message: 'Please correct the highlighted fields.' };
}

function validatePrescription(data) {
  const errors = {};
  if (!isPositiveInt(data.consultation_id) && !isPositiveInt(data.pet_id)) {
    errors.pet_id = 'Select a pet.';
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.items = 'At least one medicine item is required.';
  } else {
    data.items.forEach((item, index) => {
      if (!isPositiveInt(item.medicine_id)) {
        errors[`items.${index}.medicine_id`] = 'Select a medicine.';
      }
    });
  }

  return { valid: Object.keys(errors).length === 0, errors, message: 'Please correct the highlighted fields.' };
}

function validatePayment(data) {
  const errors = {};
  if (!isPositiveInt(data.pet_id)) errors.pet_id = 'Select a pet.';
  if (!isPositiveInt(data.payment_type_id)) errors.payment_type_id = 'Select a payment type.';
  if (!isValidOrNumber(data.or_number)) errors.or_number = 'Enter a valid OR number (3–30 characters).';
  if (data.amount && !isValidAmount(data.amount)) errors.amount = 'Enter a valid amount greater than zero.';
  if (data.payment_date && !isValidDate(data.payment_date)) errors.payment_date = 'Enter a valid payment date.';
  if (data.payment_date && !isDateNotFuture(data.payment_date)) {
    errors.payment_date = 'Payment date cannot be in the future.';
  }

  return { valid: Object.keys(errors).length === 0, errors, message: 'Please correct the highlighted fields.' };
}

function validateRecordRequest(data) {
  const errors = {};
  if (!isPositiveInt(data.pet_id)) errors.pet_id = 'Select a pet.';
  if (!REQUEST_TYPES.includes(trim(data.request_type))) errors.request_type = 'Select a valid request type.';
  if (data.format && !REQUEST_FORMATS.includes(trim(data.format))) errors.format = 'Select a valid format.';

  return { valid: Object.keys(errors).length === 0, errors, message: 'Please correct the highlighted fields.' };
}

module.exports = {
  CABUYAO_BARANGAYS,
  REQUEST_TYPES,
  REQUEST_FORMATS,
  PET_SEX_VALUES,
  STAFF_ROLES,
  ANNOUNCEMENT_AUDIENCES,
  trim,
  getPasswordChecks,
  isValidPassword,
  getPasswordError,
  isValidEmail,
  getFullNameError,
  isValidFullName,
  isValidPhonePH,
  getPhoneError,
  isValidBarangay,
  isValidOtp,
  isValidOrNumber,
  isValidAmount,
  isValidDate,
  isDateNotFuture,
  isDateOnOrAfter,
  isPositiveInt,
  validationError,
  validateOwnerRegistration,
  validateStaffUserCreation,
  validateResetPassword,
  getPetNameError,
  getPetColorError,
  validatePetRegistration,
  validateClinicalRecord,
  validateVaccinationRecord,
  validatePrescription,
  validatePayment,
  validateRecordRequest,
};
