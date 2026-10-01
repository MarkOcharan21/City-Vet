'use strict';

/**
 * Translation layer that lets the existing mysql2-style query code run against
 * PostgreSQL without touching the ~534 call sites.
 *
 * It covers only what mysql2 does for us mechanically:
 *   - '?' placeholders          -> '$1', '$2', ...
 *   - array params in 'IN (?)'  -> expanded, like mysql2's escaping
 *   - 'LIMIT ?' / 'OFFSET ?'    -> inlined literal (pg forbids bound LIMIT)
 *   - Date params               -> local wall-clock string (mysql2 parity)
 *   - boolean params            -> 1 / 0, matching the mysql2 wire protocol
 *   - results                   -> array-destructurable [rows, fields] with
 *                                  .insertId / .affectedRows, like mysql2
 *
 * Anything beyond that (ON DUPLICATE KEY, DATE_FORMAT, GET_LOCK, ...) is NOT
 * translated here on purpose: those get fixed explicitly in the controllers so
 * the MySQL fallback keeps working unchanged.
 */

// ---------------------------------------------------------------------------
// placeholder translation
// ---------------------------------------------------------------------------

function readQuoted(sql, start, quoteChar) {
  let i = start + 1;
  while (i < sql.length) {
    const c = sql[i];
    if (c === '\\' && quoteChar === "'") {
      i += 2;
      continue;
    }
    if (c === quoteChar) {
      if (sql[i + 1] === quoteChar) {
        i += 2;
        continue;
      }
      return [sql.slice(start, i + 1), i + 1];
    }
    i++;
  }
  return [sql.slice(start), sql.length];
}

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

/**
 * mysql2 has no boolean columns to worry about, and it puts JS booleans on the
 * wire as 1 / 0. Every tinyint(1) in this schema became `smallint`, not
 * `boolean`, precisely so this stays true. Values reaching a PG `boolean`
 * parameter therefore have to be spelled out in the query itself.
 */
function normalizeValue(v) {
  if (v === undefined) return null;
  if (v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) {
    // local wall clock, no offset. pg would otherwise serialise to an ISO
    // string in UTC and silently shift the value on a `timestamp` column.
    return (
      `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())} ` +
      `${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}.` +
      `${String(v.getMilliseconds()).padStart(3, '0')}`
    );
  }
  return v;
}

function toIntLiteral(value, what) {
  const n = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new Error(`[db] ${what} must be a number, got ${JSON.stringify(value)}`);
  }
  const i = Math.trunc(n);
  if (i < 0) throw new Error(`[db] ${what} must not be negative, got ${i}`);
  return String(i);
}

// Pattern matching against the nondeterministic "ci" collation needs a
// deterministic collation; kept in sync with sql.js's notLike().
const LIKE_COLLATE = 'und-x-icu';

/**
 * Counts '?' placeholders, ignoring comments and quoted text. Reused so the
 * "does this statement need translating?" check sees exactly what the main
 * scanner sees.
 */
function countQuestionMarks(sql) {
  let count = 0;
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const n = sql[i + 1];
    if (c === '-' && n === '-') {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl;
      continue;
    }
    if (c === '/' && n === '*') {
      const close = sql.indexOf('*/', i + 2);
      i = close === -1 ? sql.length : close + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const [, next] = readQuoted(sql, i, c);
      i = next;
      continue;
    }
    if (c === '?') count++;
    i++;
  }
  return count;
}

/**
 * Rewrites mysql2 SQL + params into pg SQL + params.
 * @returns {{text: string, values: any[], isInsert: boolean}}
 */
function translate(sql, params) {
  const source = params === undefined || params === null ? [] : params;

  // A statement already written with native PostgreSQL placeholders ("$1") has
  // nothing to translate. Hand the params through untouched, otherwise the arity
  // check at the end would reject them as unused. Mixing "$n" and "?" in one
  // statement stays unsupported on purpose: the positional order would be
  // ambiguous.
  if (countQuestionMarks(sql) === 0) {
    return {
      text: sql,
      values: source.map(normalizeValue),
      isInsert: detectInsert(sql),
    };
  }

  const values = [];
  let out = '';
  let i = 0;
  let paramIndex = 0;
  // Previous bare SQL word, used to reject "NOT LIKE" (see the LIKE branch).
  let lastWord = null;
  // LIMIT/OFFSET clause tracking, because pg will not accept a bound parameter
  // there:  0 = outside  1 = next '?' is the first bound value
  //         2 = one value emitted  3 = saw the MySQL comma form
  let pendingLimit = 0;

  const nextParam = () => {
    if (paramIndex >= source.length) {
      throw new Error(
        `[db] not enough parameters for query: used ${paramIndex + 1}, got ${source.length}`
      );
    }
    return source[paramIndex++];
  };

  while (i < sql.length) {
    const c = sql[i];
    const n = sql[i + 1];

    if (c === '-' && n === '-') {
      const nl = sql.indexOf('\n', i);
      const end = nl === -1 ? sql.length : nl;
      out += sql.slice(i, end);
      i = end;
      continue;
    }
    if (c === '/' && n === '*') {
      const close = sql.indexOf('*/', i + 2);
      const end = close === -1 ? sql.length : close + 2;
      out += sql.slice(i, end);
      i = end;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const [lit, next] = readQuoted(sql, i, c);
      out += lit;
      i = next;
      continue;
    }

    if (c === '?') {
      const raw = nextParam();
      if (pendingLimit === 1) {
        // first bound value of LIMIT / OFFSET
        out += toIntLiteral(raw, 'LIMIT/OFFSET');
        pendingLimit = 2;
        i++;
        continue;
      }
      if (pendingLimit === 2 || pendingLimit === 3) {
        // state 2: "LIMIT 10 ?"  state 3: MySQL "LIMIT <offset>, <count>"
        throw new Error(
          '[db] MySQL "LIMIT <offset>, <count>" is not supported on PostgreSQL; ' +
            'use "LIMIT ? OFFSET ?" instead'
        );
      }

      if (Array.isArray(raw)) {
        if (raw.length === 0) {
          // mysql2 turns IN (?) with [] into IN (NULL), which never matches
          out += 'NULL';
        } else {
          const slots = raw.map((v) => {
            values.push(normalizeValue(v));
            return `$${values.length}`;
          });
          out += slots.join(', ');
        }
        i++;
        continue;
      }

      values.push(normalizeValue(raw));
      out += `$${values.length}`;
      i++;
      continue;
    }

    // bare words only: track LIMIT / OFFSET so their '?' becomes a literal
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++;
      const word = sql.slice(i, j);
      const upper = word.toUpperCase();
      if (upper === 'LIMIT' || upper === 'OFFSET') pendingLimit = 1;

      if (upper === 'LIKE') {
        // MySQL's LIKE is case-insensitive on utf8mb4_general_ci columns. The
        // migrated columns carry the nondeterministic "ci" collation for that,
        // and PostgreSQL rejects pattern matching against it, so pin the operand
        // to the deterministic ICU collation and switch to ILIKE.
        if (lastWord === 'NOT') {
          // `x NOT LIKE y` needs the COLLATE between the operand and NOT, which
          // this streaming rewriter cannot reach. Callers must build that with
          // the notLike() helper instead of writing NOT LIKE literally.
          throw new Error(
            '[db] "NOT LIKE" is not supported by the translator; use notLike() from src/config/sql.js'
          );
        }
        out += `COLLATE "${LIKE_COLLATE}" ILIKE`;
        lastWord = upper;
        i = j;
        continue;
      }
      lastWord = /[A-Za-z0-9_]/.test(word[word.length - 1]) ? upper : null;

      out += word;
      i = j;
      continue;
    }

    if (c === ',') {
      if (pendingLimit === 1 || pendingLimit === 2) pendingLimit = 3;
      out += c;
      i++;
      continue;
    }

    // any other non-space character closes the LIMIT clause
    if (pendingLimit !== 0 && !/\s/.test(c)) pendingLimit = 0;

    out += c;
    i++;
  }

  if (paramIndex < source.length) {
    throw new Error(
      `[db] too many parameters for query: used ${paramIndex}, got ${source.length}`
    );
  }

  return { text: out, values, isInsert: detectInsert(sql) };
}

function detectInsert(sql) {
  // leading whitespace and comments do not change the statement type
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const n = sql[i + 1];
    if (c === '-' && n === '-') {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl;
      continue;
    }
    if (c === '/' && n === '*') {
      const close = sql.indexOf('*/', i + 2);
      i = close === -1 ? sql.length : close + 2;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    break;
  }
  const m = /^insert\b/i.exec(sql.slice(i));
  return Boolean(m);
}

function hasReturning(sql) {
  return /\breturning\b/i.test(sql);
}

// ---------------------------------------------------------------------------
// mysql2-shaped result
// ---------------------------------------------------------------------------

function buildResult(res, isInsert) {
  const rows = res.rows || [];
  const fields = res.fields || [];
  const affectedRows = res.rowCount === undefined || res.rowCount === null ? rows.length : res.rowCount;

  // mysql2's insertId is the generated auto-increment value. `id` is the
  // auto-increment column of every table that has one; tables without a
  // generated id (vaccination_records, roles, species, vaccines) report 0,
  // which is exactly what MySQL did for them.
  let insertId = 0;
  if (isInsert && rows.length && rows[0] && rows[0].id !== undefined && rows[0].id !== null) {
    const v = Number(rows[0].id);
    if (Number.isFinite(v)) insertId = v;
  }

  // mysql2 attaches insertId/affectedRows to the *rows* array, and callers
  // destructure that array straight out of the result:
  //   const [result] = await db.query("INSERT ...");
  //   result.insertId
  // Attaching them to the outer [rows, fields] pair instead would leave every
  // one of those 265 call sites reading undefined.
  rows.insertId = insertId;
  rows.affectedRows = affectedRows;

  const out = [rows, fields];
  // Kept for anything that holds on to the whole result rather than
  // destructuring it.
  out.rows = rows;
  out.fields = fields;
  out.insertId = insertId;
  out.affectedRows = affectedRows;
  out.changedRows = affectedRows;
  out.warningStatus = 0;
  return out;
}

// ---------------------------------------------------------------------------
// executor + mysql2-shaped connection wrapper
// ---------------------------------------------------------------------------

function createExecutor(pool) {
  async function run(exec, sql, params) {
    const { text, values, isInsert } = translate(sql, params);
    // pg has no LAST_INSERT_ID(); RETURNING hands the new row back instead.
    let finalText = text;
    if (isInsert && !hasReturning(text)) finalText = `${text} RETURNING *`;

    const res = await exec.query(finalText, values);
    return buildResult(res, isInsert);
  }

  function wrap(client) {
    return {
      query: (sql, params) => run(client, sql, params),
      execute: (sql, params) => run(client, sql, params),
      async beginTransaction() {
        await client.query('BEGIN');
      },
      async commit() {
        await client.query('COMMIT');
      },
      async rollback() {
        await client.query('ROLLBACK');
      },
      release() {
        // A session-level advisory lock outlives an aborted transaction, so a
        // request that died before unlocking would otherwise leave the pooled
        // client holding it forever. Clear them before returning it.
        client
          .query('SELECT pg_advisory_unlock_all()')
          .catch(() => {})
          .then(() => client.release());
      },
    };
  }

  return {
    run,
    wrap,
    query: (sql, params) => run(pool, sql, params),
    execute: (sql, params) => run(pool, sql, params),
    getConnection: async () => wrap(await pool.connect()),
    end: () => pool.end(),
    pool,
  };
}

module.exports = {
  translate,
  normalizeValue,
  buildResult,
  detectInsert,
  createExecutor,
  pad,
};