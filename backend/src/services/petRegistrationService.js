const db = require("../config/db");
const { createNotification, notifyUsersByRoles } = require("./notificationService");
const { validatePetRegistration, PET_SEX_VALUES } = require("../utils/validation");

class RegistrationError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function registerPetForOwner(userId, formData) {
  const {
    species_id,
    breed_id,
    breed_other,
    name,
    sex,
    color,
    birthdate,
    photo = null,
  } = formData;

  const validation = validatePetRegistration({
    name,
    species_id,
    breed_id,
    breed_other,
    sex,
    birthdate,
  });

  if (!validation.valid) {
    throw new RegistrationError(400, validation.message);
  }

  if (sex && !PET_SEX_VALUES.includes(sex)) {
    throw new RegistrationError(400, "Select a valid sex.");
  }

  const breedId = breed_id && breed_id !== "other" ? breed_id : null;
  const breedCustom = breed_id === "other" ? breed_other || null : null;

  const [ownerRows] = await db.query(
    "SELECT id FROM pet_owners WHERE user_id = ?",
    [userId],
  );

  if (ownerRows.length === 0) {
    throw new RegistrationError(404, "Pet owner profile not found.");
  }

  const petOwnerId = ownerRows[0].id;

  const [duplicatePet] = await db.query(
    `SELECT id
     FROM pets
     WHERE pet_owner_id = ?
       AND LOWER(name) = LOWER(?)
       AND species_id = ?
       AND birthdate <=> ?`,
    [petOwnerId, name.trim(), species_id, birthdate || null],
  );

  if (duplicatePet.length > 0) {
    throw new RegistrationError(409, "This pet is already registered.");
  }

  const currentYear = new Date().getFullYear();

  const [lastPet] = await db.query(
    `SELECT pet_code
     FROM pets
     WHERE pet_code LIKE ?
     ORDER BY pet_code DESC
     LIMIT 1`,
    [`PET-${currentYear}-%`],
  );

  let nextNumber = 1;

  if (lastPet.length > 0) {
    const lastSequence = parseInt(lastPet[0].pet_code.split("-")[2], 10);
    nextNumber = lastSequence + 1;
  }

  const petCode = `PET-${currentYear}-${String(nextNumber).padStart(6, "0")}`;

  const [result] = await db.query(
    `INSERT INTO pets (
      pet_owner_id, pet_code, name, species_id, breed_id,
      breed_custom, sex, color, birthdate, photo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      petOwnerId,
      petCode,
      name.trim(),
      species_id,
      breedId,
      breedCustom,
      sex,
      color || null,
      birthdate || null,
      photo,
    ],
  );

  const petId = result.insertId;

  const [[owner]] = await db.query(
    `SELECT full_name, user_id FROM pet_owners WHERE id = ?`,
    [petOwnerId],
  );

  await createNotification(
    owner.user_id,
    "Pet Registration",
    `${name.trim()} has been successfully registered.`,
    "Registration",
    false,
    "my-pets"
  );

  await notifyUsersByRoles(
    ["Staff", "Veterinarian", "Admin"],
    "New Pet Registration",
    `${owner.full_name}'s pet ${name.trim()} is awaiting verification.`,
    "Registration"
  );

  return {
    petId,
    petCode,
  };
}

module.exports = {
  RegistrationError,
  registerPetForOwner,
};
