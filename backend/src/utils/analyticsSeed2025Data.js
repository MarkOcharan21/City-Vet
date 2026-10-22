const YEAR = 2025;
const MARKER = "ANALYTICS_SEED_2025";
const PET_CODE_PREFIX = "ANL-2025-";
const EMAIL_PREFIX = "analytics.seed.2025.";

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function dateString(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function randomDateInMonth(monthIndex, random, minDay = 1) {
  const lastDay = daysInMonth(YEAR, monthIndex);
  const day = minDay + Math.floor(random() * (lastDay - minDay + 1));
  return dateString(YEAR, monthIndex, day);
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function createAnalyticsSeed2025() {
  const random = createRandom(20251022);
  const owners = [];
  const pets = [];
  const vaccinations = [];
  const payments = [];
  const paymentTypes = ["Consultation", "Vaccination", "Medicine"];

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    for (let ownerSlot = 0; ownerSlot < 2; ownerSlot += 1) {
      const ownerNumber = owners.length + 1;
      const ownerKey = `owner-${String(ownerNumber).padStart(3, "0")}`;
      const ownerCreated = randomDateInMonth(monthIndex, random);

      owners.push({
        key: ownerKey,
        number: ownerNumber,
        createdAt: ownerCreated,
      });

      for (let petSlot = 0; petSlot < 2; petSlot += 1) {
        const petNumber = pets.length + 1;
        const petKey = `pet-${String(petNumber).padStart(3, "0")}`;
        const registrationDate = randomDateInMonth(
          monthIndex,
          random,
          Number(ownerCreated.slice(-2))
        );
        const vaccineDate = randomDateInMonth(
          monthIndex,
          random,
          Number(registrationDate.slice(-2))
        );
        const speciesName = random() < 0.72 ? "Dog" : "Cat";

        pets.push({
          key: petKey,
          number: petNumber,
          ownerKey,
          speciesName,
          registrationDate,
        });

        const vaccineKey = `vax-${String(vaccinations.length + 1).padStart(3, "0")}`;
        vaccinations.push({
          key: vaccineKey,
          petKey,
          speciesName,
          dateAdministered: vaccineDate,
          nextDueDate: addDays(vaccineDate, 30),
          doseLabel: "Seed dose 1",
        });

        if (monthIndex < 11 && (petNumber + monthIndex) % 3 === 0) {
          const followUpDate = addDays(vaccineDate, 30);
          if (Number(followUpDate.slice(5, 7)) <= 12) {
            vaccinations.push({
              key: `vax-${String(vaccinations.length + 1).padStart(3, "0")}`,
              petKey,
              speciesName,
              dateAdministered: followUpDate,
              nextDueDate: addDays(followUpDate, 365),
              doseLabel: "Seed dose 2",
            });
          }
        }

        const paymentNumber = payments.length + 1;
        payments.push({
          number: paymentNumber,
          petKey,
          ownerKey,
          paymentType: paymentTypes[Math.floor(random() * paymentTypes.length)],
          serviceDate: vaccineDate,
          amount: 250 + Math.floor(random() * 751),
        });
      }
    }
  }

  return { year: YEAR, marker: MARKER, owners, pets, vaccinations, payments };
}

module.exports = {
  EMAIL_PREFIX,
  MARKER,
  PET_CODE_PREFIX,
  createAnalyticsSeed2025,
};
