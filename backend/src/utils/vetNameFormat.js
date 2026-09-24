// Reusable SQL snippet that renders a Veterinarian account's name with a
// "Dr." title (e.g. "Dr. Andrei Parala"). Non-veterinarian accounts keep
// their normal name/email.
// Expected in the query: LEFT JOIN users u ON <record>.vet_id = u.id
function vetNameExpr(alias = 'vet_name') {
  return `CASE WHEN u.role = 'Veterinarian' AND u.full_name IS NOT NULL AND u.full_name NOT LIKE 'Dr.%'
            THEN CONCAT('Dr. ', u.full_name)
            ELSE COALESCE(u.full_name, u.email)
          END AS ${alias}`;
}

module.exports = { vetNameExpr };