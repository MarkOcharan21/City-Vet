const db = require('./db');

/**
 * Small helpers for the handful of queries whose SQL genuinely differs between
 * MySQL and PostgreSQL. Everything else in the codebase stays dialect-neutral
 * (NOW(), COALESCE(), EXTRACT(), DAYOFWEEK() work on both), which keeps the
 * MySQL fallback usable.
 */

const isPg = () => db.dialect === 'postgres';

// MySQL format specifier -> PostgreSQL to_char pattern.
const SHAPES = {
  month: { mysql: '%b %Y', pg: 'Mon YYYY' },
  date: { mysql: '%Y-%m-%d', pg: 'YYYY-MM-DD' },
  time: { mysql: '%H:%i:%s', pg: 'HH24:MI:SS' },
  datetime: { mysql: '%Y-%m-%d %H:%i:%s', pg: 'YYYY-MM-DD HH24:MI:SS' },
};

/**
 * DATE_FORMAT on MySQL, TO_CHAR on PostgreSQL.
 * @param {string} column SQL expression to format
 * @param {'month'|'date'|'time'|'datetime'} shape
 * @returns {string} SQL fragment
 */
function dateFormat(column, shape) {
  const s = SHAPES[shape];
  if (!s) throw new Error(`[sql] unknown date shape "${shape}"`);
  return isPg()
    ? `TO_CHAR(${column}, '${s.pg}')`
    : `DATE_FORMAT(${column}, '${s.mysql}')`;
}

/**
 * MySQL TIME(expr) extracts the time-of-day from a datetime; PostgreSQL has no
 * TIME() function.
 */
function timeOfDay(column) {
  return isPg()
    ? `TO_CHAR(${column}, 'HH24:MI:SS')`
    : `TIME(${column})`;
}

/**
 * SQL expression giving 0 for Monday .. 6 for Sunday (i.e. MySQL's WEEKDAY()).
 * MySQL exposes DAYOFWEEK (1 = Sunday); PostgreSQL only has EXTRACT(DOW)
 * (0 = Sunday), so each side needs its own offset.
 */
function mondayIndex() {
  return isPg()
    ? '((EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7)'
    : '((DAYOFWEEK(CURRENT_DATE) + 5) % 7)';
}

/**
 * MySQL GROUP_CONCAT(col SEPARATOR sep) is STRING_AGG(col, sep) in PostgreSQL.
 */
function groupConcat(column, separator = ',') {
  const sep = separator.replace(/'/g, "''");
  return isPg()
    ? `STRING_AGG(${column}, '${sep}')`
    : `GROUP_CONCAT(${column} SEPARATOR '${sep}')`;
}

/**
 * Text after the final delimiter, e.g. "STF-2026-0001" with '-' -> "0001".
 * MySQL has SUBSTRING_INDEX; PostgreSQL needs a regex instead.
 */
function lastSegment(column, delimiter = '-') {
  if (delimiter !== '-') {
    throw new Error(`[sql] lastSegment only supports "-", got "${delimiter}"`);
  }
  return isPg()
    ? `SUBSTRING(${column} FROM '[^-]*$')`
    : `SUBSTRING_INDEX(${column}, '-', -1)`;
}

/** MySQL CAST(x AS UNSIGNED) / PostgreSQL cast to integer. */
function toInt(column) {
  return isPg() ? `CAST(${column} AS integer)` : `CAST(${column} AS UNSIGNED)`;
}

/**
 * MySQL coerces the first argument to a string for string functions; PostgreSQL
 * does not, so LPAD/SUBSTR on a numeric column has to be cast explicitly.
 */
function toText(column) {
  return isPg() ? `CAST(${column} AS text)` : column;
}

/**
 * "n days before now" as a value comparable against a timestamp column.
 * `NOW() - 30` is invalid on PostgreSQL (there is no timestamp - integer).
 */
function daysAgo(n) {
  return isPg()
    ? `(NOW() - INTERVAL '${Number(n)} days')`
    : `DATE_SUB(NOW(), INTERVAL ${Number(n)} DAY)`;
}

/**
 * MySQL lets SUM() take a boolean expression (SUM(status = 'Verified') counts
 * matches). PostgreSQL has SUM(bigint) only, so the comparison has to be turned
 * into 1/0 first.
 * @param {string} expr boolean SQL expression, e.g. "ot.status = 'Verified'"
 */
function sumBool(expr) {
  return isPg() ? `SUM(CASE WHEN ${expr} THEN 1 ELSE 0 END)` : `SUM(${expr})`;
}

/**
 * MySQL's "<=>" is a NULL-safe equality: NULL <=> NULL is true, whereas both
 * `=` and PostgreSQL's IS NOT DISTINCT FROM need spelling out.
 * @param {string} left SQL expression
 * @param {string} right SQL expression (not a bind param; pass NULL literally)
 */
function nullSafeEq(left, right) {
  return isPg() ? `(${left} IS NOT DISTINCT FROM ${right})` : `(${left} <=> ${right})`;
}

/**
 * Case-insensitive pattern match.
 *
 * The migrated columns carry the nondeterministic "ci" collation so that "="
 * stays case-insensitive like MySQL's utf8mb4_general_ci. PostgreSQL refuses
 * pattern matching on such a column, so the operand is pinned to the
 * deterministic ICU collation for the comparison.
 */
const LIKE_COLLATE = 'und-x-icu';

function notLike(column, pattern) {
  return isPg()
    ? `(${column} COLLATE "${LIKE_COLLATE}" NOT ILIKE ${pattern})`
    : `(${column} NOT LIKE ${pattern})`;
}

module.exports = {
  dateFormat,
  timeOfDay,
  groupConcat,
  lastSegment,
  toInt,
  toText,
  daysAgo,
  sumBool,
  nullSafeEq,
  notLike,
  LIKE_COLLATE,
  mondayIndex,
  dialect: () => db.dialect,
  isPg,
};