const db = require("../config/db");

const ROLE_PREFIXES = {
  Staff: "STF",
  Veterinarian: "VET",
  Admin: "ADM",
};

/**
 * Generates the next account ID for a role, e.g. STF-2026-0001 / VET-2026-0001.
 * The sequence is per role + current year and is derived from existing rows,
 * so it stays consistent even if rows are removed.
 */
async function nextAccountId(role) {
  const prefix = ROLE_PREFIXES[role] || "USR";
  const year = new Date().getFullYear();

  const [[{ maxSeq }]] = await db.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(account_id, '-', -1) AS UNSIGNED)), 0) AS maxSeq
     FROM users
     WHERE account_id LIKE ?`,
    [`${prefix}-${year}-%`]
  );

  const seq = Number(maxSeq || 0) + 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

module.exports = { nextAccountId, ROLE_PREFIXES };