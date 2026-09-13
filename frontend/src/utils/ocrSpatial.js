// Spatial (row-aware) parsing layer — pure functions, no browser libs.
// The PaddleOCR sidecar returns per-detection boxes normalized to 0..1. We
// group detections into *physical rows* by their vertical position and assign
// each row's cells left-to-right. Field extraction then works on rows (label
// cells + value cells + table columns) instead of assuming a fixed layout or a
// "whole row on one text line" (the item table prints description / account
// code / amount as separate OCR blocks).

function lineBox(ln) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  if (Array.isArray(ln.box)) {
    for (const p of ln.box) {
      if (!Array.isArray(p)) continue;
      const x = Number(p[0]), y = Number(p[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x0: minX, y0: minY, x1: maxX, y1: maxY };
}

export function normLines(lines) {
  const raw = (lines || [])
    .filter((l) => l && l.text && String(l.text).trim())
    .map((l) => {
      const b = lineBox(l);
      const text = String(l.text);
      if (!b) return null;
      return {
        text,
        confidence: l.confidence ?? 0,
        x0: b.x0,
        y0: b.y0,
        x1: b.x1,
        y1: b.y1,
        cx: (b.x0 + b.x1) / 2,
        cy: (b.y0 + b.y1) / 2,
      };
    })
    .filter(Boolean);

  // The sidecar emits boxes normalized to 0..1, but older captures / some
  // clients return raw pixel coordinates. Detect and rescale to 0..1 so the
  // row-grouping tolerance works regardless of source.
  let maxX = 1, maxY = 1;
  for (const l of raw) {
    if (l.x1 > maxX) maxX = l.x1;
    if (l.y1 > maxY) maxY = l.y1;
  }
  const huge = maxX > 1.5 || maxY > 1.5;
  return raw.map((l) => {
    if (huge) {
      return {
        ...l,
        x0: l.x0 / maxX,
        y0: l.y0 / maxY,
        x1: l.x1 / maxX,
        y1: l.y1 / maxY,
        cx: l.cx / maxX,
        cy: l.cy / maxY,
      };
    }
    return l;
  });
}

// Group OCR detections into physical rows based on vertical proximity (relative
// coordinates). Returns rows of { cy, y0, y1, cells } with cells sorted by x.
export function groupIntoRows(lines) {
  const norm = normLines(lines);
  if (!norm.length) return [];
  const heights = norm.map((l) => l.y1 - l.y0).sort((a, b) => a - b);
  const medH = heights[Math.floor(heights.length / 2)] || 0.01;
  const tol = Math.min(0.02, Math.max(0.008, medH * 0.75));

  const rows = [];
  for (const ln of norm.slice().sort((a, b) => a.cy - b.cy)) {
    let row = null;
    for (let r = rows.length - 1; r >= 0; r -= 1) {
      if (Math.abs(rows[r].cy - ln.cy) <= tol) {
        row = rows[r];
        break;
      }
    }
    if (!row) {
      row = { cy: ln.cy, y0: Infinity, y1: -Infinity, cells: [] };
      rows.push(row);
    }
    row.cells.push(ln);
    const n = row.cells.length;
    row.cy = (row.cy * (n - 1) + ln.cy) / n;
    row.y0 = Math.min(row.y0, ln.y0);
    row.y1 = Math.max(row.y1, ln.y1);
  }
  for (const r of rows) {
    r.cells.sort((a, b) => a.cx - b.cx || a.x0 - b.x0);
  }
  rows.sort((a, b) => a.cy - b.cy);
  return rows;
}

export function rowText(row) {
  return (row?.cells || []).map((c) => c.text).join(' ');
}

export function rowConfidence(row) {
  return (row?.cells || []).length
    ? Math.min(...row.cells.map((c) => Number(c.confidence) || 0))
    : 0;
}

const DATE_CELL_RE = /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?:\s*(am|pm))?)?/i;
// Strong label: O.R.# / OR # / Official Receipt No. / Receipt No. «code»
const STRONG_OR_RE = /\b(?:o\.?\s*r\.?\s*((?:n[oO]\.?)?\s*[#.]?)?|official\s+receipt\s*(?:n[oO]\.?|#)?|receipt\s*(?:n[oO]\.?|#)?)\s*[:#.]?\s*([A-Z0-9][0-9A-Z\s\-\/_]{1,24})/i;
// Weak label: a bare "No. / № / number" — must NOT follow the word FORM so the
// form number ("Accountable Form No. 51-C") is skipped.
const WEAK_OR_RE = /(?<!form\s)(?:(?<![A-Za-z])n[oO][.]?\b|number|num\b)\s*[:#.]?\s*([A-Z0-9][0-9A-Z\s\-\/_]{1,24})/i;
const CODE_CELL_RE = /^\d{6,10}$/;

function toISO(y, m, d) {
  m = String(m).padStart(2, "0");
  d = String(d).padStart(2, "0");
  y = String(y);
  if (y.length === 2) y = `20${y}`;
  if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31 && y.length === 4) {
    return `${y}-${m}-${d}`;
  }
  return null;
}

function to24Hour(h, m, ampm) {
  let hour = Number(h);
  const minute = Number(m);
  if (ampm) {
    const upper = String(ampm).toUpperCase();
    if (upper === "PM" && hour < 12) hour += 12;
    if (upper === "AM" && hour === 12) hour = 0;
  }
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeOrValue(value) {
  if (!value) return null;
  let v = String(value).trim()
    .replace(/^[\s:.#-]+/, "")
    .replace(/[\s.]+/g, "")
    .replace(/[-_]+$/, "")
    .trim();
  if (!/\d/.test(v)) return null;
  return v;
}

function looksLikeDate(t) {
  return /\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}/.test(t) || /:\d{2}/.test(t);
}

export function extractOrNumberFromRows(rows, text) {
  let best = null;
  const consider = (value, confidence, labelled, score) => {
    const val = normalizeOrValue(value);
    if (!val || val.length < 3) return;
    if (!best || score > best.score || (score === best.score && confidence > best.confidence)) {
      best = { value: val, confidence, labelled, needs_review: !labelled, score };
    }
  };

  for (const row of rows) {
    for (const cell of row.cells) {
      const t = cell.text.trim();
      if (looksLikeDate(t)) continue;
      // "Accountable Form No. 51-C" / booklet/cycle tags are never the OR number.
      if (/\b(?:accountable|form|cycle|booklet|bundle)\b/i.test(t)) continue;
      const strong = STRONG_OR_RE.exec(t);
      if (strong) {
        consider(strong[2], Number(cell.confidence) || 0, true, 3);
        continue;
      }
      const weak = WEAK_OR_RE.exec(t);
      if (weak) {
        consider(weak[1], Number(cell.confidence) || 0, true, 1);
      }
    }
  }
  if (best) return best;

  // Fallback: a standalone serial in the top half of the page (the OR number is
  // usually printed beside the "Official Receipt" title). Avoids account codes
  // (they live inside the table below), TIN runs and dates.
  for (const row of rows) {
    if (row.cy > 0.45) break;
    for (const cell of row.cells) {
      const t = cell.text.trim();
      if (looksLikeDate(t) || CODE_CELL_RE.test(t)) continue;
      if (/^[A-Z]?\d[\dA-Z\-\/_]{2,18}$/.test(t) && !/^[A-Za-z]+\s|^[A-Za-z]{4,}/.test(t) && /\d{3,}/.test(t)) {
        const val = normalizeOrValue(t);
        if (val && val.length >= 3) {
          return { value: val, confidence: Number(cell.confidence) || 0, labelled: false, needs_review: true };
        }
      }
    }
  }
  return null;
}

const PAYOR_LABEL_RE = /\b(?:payor|payer|paid\s+by|payee|received\s+from|name\s+of\s+payor|payor'?s?\s*name)\b/i;
const NAME_NOISE_RE = /\b(?:payor|payer|paid\s+by|payee|received\s+from|received\s+the|agency|fund|nature\s+of|account|amount|cash\s+tendered|change\s*:|collecting\s+officer|received|drawee|cash|bank|check\s*:|money\s+order|no\.?|number|date\s*:|time\s*:)\b/i;

export function cleanOwnerValue(value) {
  let v = String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[|_=+*/\\]/g, '')
    .replace(/([A-Za-z])\.([A-Za-z])/g, '$1 $2')
    .replace(/^\s*\d[\d\s/.-]*\s*[-–—]?\s*/, '')
    .trim();
  v = v.replace(/[.,;:'"\s]+$/, '').trim();
  return v;
}

export function extractOwnerFromRows(rows) {
  for (const row of rows) {
    const cells = row.cells;
    const labelIdx = cells.findIndex((c) => PAYOR_LABEL_RE.test(c.text));
    if (labelIdx < 0) continue;
    const valueCells = cells.filter((c, i) => i !== labelIdx && !NAME_NOISE_RE.test(c.text));
    const raw = valueCells.map((c) => c.text).join(' ');
    const name = cleanOwnerValue(raw);
    if (name && name.length >= 4 && /[A-Za-z]{2,}/.test(name)) {
      return {
        value: name,
        confidence: rowConfidence(row),
        needs_review: rowConfidence(row) < 0.7,
      };
    }
  }

  // Label sits alone on its row and the value is on the row(s) right below.
  for (let i = 0; i < rows.length; i += 1) {
    const cells = rows[i].cells;
    if (!cells.some((c) => PAYOR_LABEL_RE.test(c.text))) continue;
    if (!(cells.every((c) => NAME_NOISE_RE.test(c.text) || PAYOR_LABEL_RE.test(c.text)))) continue;
    for (let j = i + 1; j < Math.min(i + 3, rows.length); j += 1) {
      const t = rowText(rows[j]);
      if (/\b(amount\s+paid|collecting officer|received the|certificate|nature of)\b/i.test(t)) break;
      const name = cleanOwnerValue(t);
      if (name && name.length >= 4 && /[A-Za-z]{2,}/.test(name) && !/\b(agency|fund|office of the)\b/i.test(name)) {
        return { value: name, confidence: rowConfidence(rows[j]), needs_review: true };
      }
    }
  }
  return null;
}

export function extractDateFromRows(rows, text) {
  const labelRe = /\b(?:date|issued|dated|payment\s+date|transaction\s+date)\s*[:#]?\s*(\d{2,4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?:\s*(am|pm))?)?/i;
  for (const row of rows) {
    const t = rowText(row);
    const m = labelRe.exec(t);
    if (m) {
      let iso = null;
      if (m[1].length === 4) iso = toISO(m[1], m[2], m[3]);
      else {
        iso = toISO(m[2], m[1], m[3]) || toISO(m[2], m[3], m[1]);
      }
      if (iso) {
        return {
          value: iso,
          time: m[4] ? to24Hour(m[4], m[5], m[6]) : null,
          confidence: rowConfidence(row),
        };
      }
    }
  }

  for (const row of rows) {
    for (const cell of row.cells) {
      const m = DATE_CELL_RE.exec(cell.text.trim());
      if (m) {
        const iso = toISO(m[1], m[2], m[3]);
        if (iso) {
          return {
            value: iso,
            time: m[4] ? to24Hour(m[4], m[5], m[6]) : null,
            confidence: Number(cell.confidence) || 0,
          };
        }
      }
    }
  }
  return { value: null, time: null, confidence: null };
}

function classifyCell(cell) {
  const t = cell.text.trim();
  if (CODE_CELL_RE.test(t)) return { kind: 'code' };
  const amt = /^(?:[₱P]\s*)?([\d,]+(?:\.\d{1,2})?)$/.exec(t);
  if (amt && /\d/.test(amt[1])) {
    return { kind: 'amount', value: parseFloat(amt[1].replace(/,/g, '')).toFixed(2), confidence: Number(cell.confidence) || 0 };
  }
  const glued = /(\d{6,10})\s+([\d,]+(?:\.\d{1,2})?)$/.exec(t);
  if (glued) {
    return {
      kind: 'mixed',
      code: glued[1],
      amount: parseFloat(glued[2].replace(/,/g, '')).toFixed(2),
      amountConfidence: Number(cell.confidence) || 0,
      desc: t.slice(0, glued.index).trim(),
    };
  }
  return { kind: 'text', text: t };
}

const TABLE_HEADER_RE = /\b(?:nature\s+of\s+(?:certificate|account|transaction)|certificate\s+true\s+copy|particulars?|details?\s+of\s+payment|account\s+code)\b/i;
const TABLE_DATA_STOP_RE = /\b(?:amount\s+paid|amount\s+in\s+words|cash\s+tendered|change\s*[:]?|grand\s+total|\btotal\b|received\s+the|collecting\s+officer|drawee|issued\s+by|collected\s+by|true\s+copy|certificate\s+of\s+cash|note\s*:)\b/i;
const TABLE_NOISE_RE = /\b(?:nature\s+of\s+|certificate\s+true\s+copy|office\s+of|republic|official\s+receipt)\b/i;
const SERVICE_RE = /\b(?:consult|vaccin|rabies|deworm|medic|suppl|registration|certificat|fee|veterinar|antibiotic|vitamin|drug|treatment|exam|procedure|surgery|laboratory)\b/i;

export function findTableStart(rows) {
  const subHeader = /\b(?:code|certificate\s+true\s+copy)\b/i;
  for (let i = 0; i < rows.length; i += 1) {
    if (!TABLE_HEADER_RE.test(rowText(rows[i]))) continue;
    // The header may spill onto a second physical row ("Certificate True Copy |
    // Code") — include it so the first data row is not treated as a stop.
    while (i + 1 < rows.length) {
      const t = rowText(rows[i + 1]);
      if (!subHeader.test(t) || amountFromRow(rows[i + 1])) break;
      i += 1;
    }
    return i;
  }
  return -1;
}

export function buildItemsFromRows(rows, startIdx) {
  const items = [];
  for (let i = startIdx + 1; i < rows.length && items.length < 15; i += 1) {
    const row = rows[i];
    const t = rowText(row);
    if (TABLE_DATA_STOP_RE.test(t)) break;
    if (TABLE_NOISE_RE.test(t)) continue;

    const cells = row.cells.map(classifyCell);
    const descParts = [];
    let amount = '';
    let amountConf = null;
    for (const c of cells) {
      if (c.kind === 'code') continue;
      if (c.kind === 'amount') {
        amount = c.value;
        amountConf = c.confidence;
        continue;
      }
      if (c.kind === 'mixed') {
        descParts.push(c.desc);
        amount = c.amount;
        amountConf = c.amountConfidence;
        continue;
      }
      descParts.push(c.text);
    }
    let desc = descParts.join(' ').replace(/\s{2,}/g, ' ').trim();
    desc = desc.replace(/(?:^|\s)\d{6,10}(?=\s|$)/g, ' ').replace(/\s{2,}/g, ' ').trim();

    if (!amount && !desc) continue;
    if (!amount && !SERVICE_RE.test(desc)) continue;

    const rowConf = rowConfidence(row);
    const needsReview = !amount || (amountConf != null && amountConf < 0.7) || rowConf < 0.6;
    items.push({
      description: desc || 'Payment',
      amount,
      confidence: amountConf ?? rowConf,
      needs_review: needsReview,
    });
  }
  return items;
}

function amountFromRow(row) {
  for (const cell of row.cells) {
    const t = cell.text.trim();
    const m = /^(?:[₱P]\s*)?([\d,]+(?:\.\d{1,2})?)$/.exec(t);
    if (m && /\d/.test(m[1]) && !CODE_CELL_RE.test(m[1])) {
      return { value: parseFloat(m[1].replace(/,/g, '')).toFixed(2), confidence: Number(cell.confidence) || 0 };
    }
  }
  return null;
}

export function extractAmountPaidFromRows(rows, text) {
  const labels = [/\bamount\s+paid\b/i, /\bcash\s+tendered\b/i];
  for (const labelRe of labels) {
    for (let i = 0; i < rows.length; i += 1) {
      if (!labelRe.test(rowText(rows[i]))) continue;
      const same = amountFromRow(rows[i]);
      if (same) return same;
      // Label printed on its own line with the amount just below it.
      for (let j = i + 1; j <= i + 2; j += 1) {
        const r = rows[j];
        if (!r) break;
        const t = rowText(r);
        if (/\b(?:amount\s+in\s+words|collecting\s+officer|certificate\s+true)\b/i.test(t)) break;
        const below = amountFromRow(r);
        if (below) return below;
      }
    }
  }
  return null;
}