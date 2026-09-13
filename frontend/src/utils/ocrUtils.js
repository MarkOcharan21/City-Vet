import { createWorker } from "tesseract.js";
import {
  normLines,
  groupIntoRows,
  rowText,
  rowConfidence,
  extractOrNumberFromRows,
  extractOwnerFromRows,
  extractDateFromRows,
  extractAmountPaidFromRows,
  findTableStart,
  buildItemsFromRows,
  cleanOwnerValue,
} from "./ocrSpatial";

let workerPromise = null;
let lastProgressCb = null;

// Use locally bundled OCR assets first (fast on LAN and works offline). If they
// cannot be fetched, Tesseract falls back to its jsDelivr defaults.
const OCR_BASE = `${import.meta.env.BASE_URL || "/"}tesseract/`;
const LOCAL_OCR_OPTIONS = {
  workerPath: `${OCR_BASE}worker.min.js`,
  corePath: OCR_BASE,
  langPath: OCR_BASE,
};

async function createOcrWorker() {
  try {
    return await createWorker("eng", 1, {
      logger: () => {},
      workerBlobURL: true,
      ...LOCAL_OCR_OPTIONS,
    });
  } catch (err) {
    console.warn("[OCR] Local assets unavailable, using CDN.", err?.message || err);
    return createWorker("eng", 1, { logger: () => {} });
  }
}

function getWorker() {
  if (!workerPromise) {
    workerPromise = createOcrWorker().catch((err) => {
      // Do not cache a rejected promise — let the next call retry.
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

// Run OCR on an image source (data URL, file, Image, URL, element) and return
// the raw tesseract result { text, confidence, ... }.
export async function ocrImage(imageSource) {
  // If the image is a Blob bigger than our OCR budget (e.g. the raw phone photo
  // reached here after image preparation failed), downscale first — Tesseract
  // on a 48 MP canvas is the #1 way to OOM a phone browser.
  let source = imageSource;
  if (source instanceof Blob && (source.size > 6 * 1024 * 1024)) {
    try {
      source = await downscaleForOcr(source) || source;
    } catch (_) {
      /* keep the original */
    }
  }
  try {
    const worker = await getWorker();
    // rotateAuto fixes slightly tilted phone shots before reading the text.
    const { data } = await worker.recognize(source, { rotateAuto: true }, { text: true, blocks: true });
    return data;
  } catch (err) {
    // A crashed/OOM worker poisons every later call ("previous operation").
    // Discard it and retry once with a pristine worker before reporting.
    console.warn("[OCR] First pass failed — rebuilding worker and retrying once.", err?.message || err);
    await disposeOcr();
    const worker = await getWorker();
    const { data } = await worker.recognize(source, { rotateAuto: true }, { text: true, blocks: true });
    return data;
  }
}

export async function disposeOcr() {
  if (workerPromise) {
    try {
      const worker = await workerPromise;
      await worker.terminate();
    } catch (_) {}
    workerPromise = null;
  }
}

// ---------------------------------------------------------------------------
// Server-side (PaddleOCR) entry point. Used first; the client Tesseract worker
// stays as an offline/fallback path via ocrImage().
// ---------------------------------------------------------------------------

/**
 * Send an image Blob to the backend PaddleOCR sidecar.
 * Returns { success, engine, text, confidence, lines } or throws on failure.
 */
export async function ocrImageServer(blob, onStep, options = {}) {
  if (onStep) onStep(options.refine ? "Re-reading with the fine-pass…" : "Uploading to OCR server…");
  const formData = new FormData();
  formData.append("or_photo", blob, "receipt.jpg");
  if (options.refine) formData.append("refine", "1");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  let response;
  try {
    // VITE_API_URL is "/api" in dev (Vite proxies it to the backend). Same
    // relative default as the rest of the app — a phone must never resolve to
    // its own localhost, which would silently fall back to the slow on-device OCR.
    const base = import.meta.env.VITE_API_URL || "/api";
    response = await fetch(`${base}/payment-monitoring/ocr`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("staff_localhost_token") || localStorage.getItem("token") || ""}`,
      },
      body: formData,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success !== true) {
    throw new Error((data && data.message) || `OCR server responded ${response.status}`);
  }
  return data;
}

// -------------------------------
// Image preparation (mobile-friendly)
// -------------------------------

// Keep every OCR canvas inside the device raster budget. Phone camera photos
// (12–48 MP) otherwise materialize at full size before we downscale, and the
// 2x "faint table" variant then rebuilds them at 4x the pixels — on mobile that
// exceeds the canvas memory budget and the browser throws "Unable to complete
// previous operation due to low memory".
const OCR_MAX_EDGE = 2000;
const OCR_BIN_MAX_EDGE = 2400;

async function decodeImage(source) {
  if (typeof createImageBitmap === "function") {
    // Resize-before-decode (Chromium/Safari/Firefox) stops a giant phone photo
    // from ever fully materializing in RAM — the most common trigger of the
    // low-memory canvas error on mobile.
    const resize = { resizeWidth: OCR_MAX_EDGE, resizeHeight: OCR_MAX_EDGE, resizeQuality: "high" };
    try {
      // Respect EXIF rotation so photos taken on a phone are not read sideways.
      return await createImageBitmap(source, { imageOrientation: "from-image", ...resize });
    } catch (_) {
      /* fall through */
    }
    try {
      return await createImageBitmap(source, resize);
    } catch (_) {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Downscale a phone/camera photo, convert to grayscale and stretch contrast so
// Tesseract gets a clean, fast image to read. Returns the enhanced image as a
// JPEG Blob plus a data URL for the on-screen preview.
// Unsharp mask: gentle box-blur detail boost (radius 1, strength ~0.85).
function unsharpMask(data, width, height) {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        const rrow = yy * width;
        for (let dx = -1; dx <= 1; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          sum += data[(rrow + xx) * 4];
          count += 1;
        }
      }
      const blurred = sum / count;
      const val = data[(row + x) * 4];
      const sharp = val + 0.85 * (val - blurred);
      const o = (row + x) * 4;
      out[o] = sharp;
      out[o + 1] = sharp;
      out[o + 2] = sharp;
      out[o + 3] = 255;
    }
  }
  return out;
}

// Downscale a phone/camera photo, convert to grayscale and stretch contrast so
// Tesseract gets a clean, fast image to read. Returns the enhanced image as a
// JPEG Blob plus a data URL for the on-screen preview.
//
// A second, "faint table" variant (binBlob) is also produced: a hard black/white
// threshold binarization at FINE_OCR_THRESHOLD with 2x nearest upscale. Treasury
// OR item rows are printed in very light ink that normal OCR misses; this
// variant pulls those rows back (it also works great for QR photos).
export const FINE_OCR_THRESHOLD = 205;

export async function enhanceImageForOcr(source) {
  const image = await decodeImage(source);
  let width = image.width || image.videoWidth || 0;
  let height = image.height || image.videoHeight || 0;
  if (!width || !height) throw new Error("Could not decode the receipt image.");

  const scale = Math.min(1, OCR_MAX_EDGE / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  if (typeof image.close === "function") image.close();

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Keep the untouched luminance around for the binarized variant.
  const originalLum = new Uint8ClampedArray(width * height);

  let min = 255;
  let max = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = lum;
    originalLum[p] = lum;
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }

  const gain = 255 / Math.max(1, max - min);
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v += 1) {
    lut[v] = Math.max(0, Math.min(255, Math.round((v - min) * gain)));
  }
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }

  // Light unsharp mask so slightly soft phone-camera text reads better.
  const sharpened = unsharpMask(data, width, height);
  ctx.putImageData(new ImageData(sharpened, width, height), 0, 0);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Could not prepare the receipt image.");

  // Binarized "faint table" variant: original luminance, hard threshold, 2x.
  let binBlob = null;
  try {
    const grayCanvas = document.createElement("canvas");
    grayCanvas.width = width;
    grayCanvas.height = height;
    const grayImageData = new ImageData(new Uint8ClampedArray(originalLum.length * 4), width, height);
    const grayPx = grayImageData.data;
    for (let p = 0; p < originalLum.length; p += 1) {
      const o = p * 4;
      grayPx[o] = grayPx[o + 1] = grayPx[o + 2] = originalLum[p];
      grayPx[o + 3] = 255;
    }
    grayCanvas.getContext("2d").putImageData(grayImageData, 0, 0);

    // 2x nearest upscale — but only up to a hard pixel cap. Without the cap a
    // big camera photo would be rebuilt at 4x its pixels (a ~80 MP canvas on
    // mobile) and the browser dies with a low-memory error.
    const binScale = Math.min(2, OCR_BIN_MAX_EDGE / Math.max(width, height));
    const binCanvas = document.createElement("canvas");
    binCanvas.width = Math.max(1, Math.round(width * binScale));
    binCanvas.height = Math.max(1, Math.round(height * binScale));
    const bctx = binCanvas.getContext("2d", { willReadFrequently: true });
    bctx.imageSmoothingEnabled = false; // nearest-neighbour: keeps thin strokes
    bctx.drawImage(grayCanvas, 0, 0, binCanvas.width, binCanvas.height);
    const binData = bctx.getImageData(0, 0, binCanvas.width, binCanvas.height);
    const bp = binData.data;
    for (let i = 0; i < bp.length; i += 4) {
      const v = bp[i] >= FINE_OCR_THRESHOLD ? 255 : 0;
      bp[i] = bp[i + 1] = bp[i + 2] = v;
      bp[i + 3] = 255;
    }
    bctx.putImageData(binData, 0, 0);
    binBlob = await new Promise((resolve) => binCanvas.toBlob(resolve, "image/png"));
  } catch (binErr) {
    console.warn('[OCR] Faint-table variant failed — continuing with the enhanced image.', binErr);
  }

  return { blob, dataUrl: canvas.toDataURL("image/jpeg", 0.85), binBlob };
}

// Minimal fallback for when enhanceImageForOcr() itself was skipped/failed and
// a large raw photo reached the on-device reader: decode it inside the pixel
// budget and re-encode as a smaller JPEG. Returns a Blob or null on failure.
export async function downscaleForOcr(source) {
  try {
    const image = await decodeImage(source);
    const width = image.width || 0;
    const height = image.height || 0;
    if (!width || !height) return null;
    const scale = Math.min(1, OCR_MAX_EDGE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d", { willReadFrequently: false }).drawImage(image, 0, 0, w, h);
    if (typeof image.close === "function") image.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob || null;
  } catch (_) {
    return null;
  }
}

// Receipt detail extraction helpers
// -------------------------------

// Match a plausible OR number: "OR No. 12345", "OR# 00123-4", "OR 2026-000123",
// or a leading numeric run. Returns the cleaned value or null.
export function extractOrNumber(text) {
  if (!text) return null;

  // Prefer an explicit OR label followed by an alphanumeric code.
  // \b guards protect against matching "OR" as a substring (e.g. in FORM, PAYOR).
  const labelled =
    /(?:\bofficial\s+receipt\s*(?:no\.?|#)?|\bOR\b\s*(?:[.#]|\bno\.?\b)?|\bO\.?\s*R\.?\s*(?:no\.?)?)\s*:?\s*([A-Z0-9][A-Z0-9\-_/\\ .]{2,30})/i.exec(
      text
    );
  if (labelled) {
    const val = labelled[1].trim().replace(/^[\s:.#-]+/, "");
    // A real OR number must look like a code/serial — require at least one digit
    // so words like "IGINAL" (from ORIGINAL) or other false labels are rejected.
    if (val && /\d/.test(val)) return val;
  }

  // Fallback: the receipt serial is often a 5-8 digit number stamped right after
  // the "Official Receipt" / "Republic of the Philippines" header.
  const header =
    /(?:official\s+receipt|republic\s+of\s+the\s+philippines|form\s+no\.?)\b(?:(?!date\s*:)[\s\S]){0,120}?\b(\d{5,8})\b/i.exec(
      text
    );
  if (header) return header[1];

  // Last resort: a clear standalone 5+ digit numeric run (receipt serials on
  // these Treasury ORs are 5-8 digits). Years ("2026") and small amounts are
  // deliberately not accepted here, so the OR field never fills with garbage.
  const numeric = /(?:^|[^\d])(?:no\.?\s*:?\s*|#)?\s*(\d{5,})/i.exec(text);
  return numeric && !/^2[01]\d{2}$/.test(numeric[1]) ? numeric[1] : null;
}

// Match a date: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD, or word-month "July 5, 2026".
// Prefers a labelled date (e.g. "Date: 2026-07-02") to avoid false positives
// from numeric account/code sequences like "4-02-01-010".
// Returns "YYYY-MM-DD" (input[type=date] format) or null.
export function extractDate(text) {
  if (!text) return null;

  const toISO = (y, m, d) => {
    m = String(m).padStart(2, "0");
    d = String(d).padStart(2, "0");
    y = String(y);
    if (y.length === 2) y = `20${y}`;
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31 && y.length === 4) {
      return `${y}-${m}-${d}`;
    }
    return null;
  };

  // 1) A date explicitly labelled "Date:", "Issued:", "Payment Date:", "Dated:".
  const labelled =
    /(?:date|issued|dated|payment\s+date)\s*[:#]?\s*(\d{2,4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/i.exec(
      text
    );
  if (labelled) {
    let [, a, b, c] = labelled;
    // Decide order: YYYY-M-D vs M-D-YYYY / D-M-YYYY.
    if (a.length === 4) {
      const iso = toISO(a, b, c);
      if (iso) return iso;
    } else {
      for (const [m, d] of [[a, c], [c, a]]) {
        const iso = toISO(b, m, d);
        if (iso) return iso;
      }
    }
  }

  // 2) Standalone YYYY-MM-DD (year first, unambiguous).
  const yearFirst = /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/.exec(text);
  if (yearFirst) {
    const iso = toISO(yearFirst[1], yearFirst[2], yearFirst[3]);
    if (iso) return iso;
  }

  // 3) Generic MM/DD/YYYY or DD/MM/YYYY, but only when the year is 4 digits
  //    so numeric account codes (e.g. 4-02-01) are not misread as dates.
  const numeric =
    /(\b\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/.exec(text);
  if (numeric) {
    for (const [m, d] of [[numeric[1], numeric[3]], [numeric[3], numeric[1]]]) {
      const iso = toISO(numeric[2], m, d);
      if (iso) return iso;
    }
  }

  const monthNames =
    /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i.exec(
      text
    );
  if (monthNames) {
    const months = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const monthKey = monthNames[1].slice(0, 3).toLowerCase();
    const mm = String(months[monthKey] || 1).padStart(2, "0");
    const dd = monthNames[2].padStart(2, "0");
    return `${monthNames[3]}-${mm}-${dd}`;
  }

  return null;
}

// Match a peso amount: "₱500.00", "P 500.00", "500.00", or "500".
// Prefers a labelled row (TOTAL/AMOUNT) to avoid grabbing unrelated numbers.
// Returns a plain decimal string (e.g. "500.00") or null.
export function extractAmount(text) {
  if (!text) return null;

  const clean = text.replace(/[₱P]\s?/gi, " "); // normalize peso signs safely

  const parse = (captured) => {
    const digits = captured.replace(/[,\s]/g, "");
    const val = parseFloat(digits);
    if (Number.isFinite(val) && val > 0) return val.toFixed(2);
    return null;
  };

  // 1) A TOTAL line — Treasury ORs print "TOTAL EIGHT HUNDRED PESOS ONLY 850.00",
  //    where words sit between the label and the number.
  const totalLine =
    /(?:total|totaI|totai|grand\s+total)\b[^\n0-9]*([\d,]+(?:\.\d{1,2})?)/i.exec(
      clean
    );
  if (totalLine) {
    const val = parse(totalLine[1]);
    if (val) return val;
  }

  // 2) A labelled row such as "Amount: 500.00", "Paid 500.00", "AMT 500.00".
  const labelled =
    /(?:amount\s+(?:due|paid|collected)?|paid|amnt|amt)\s*[:.]?\s*[₱P]?\s*([\d,]+\.?\d{0,2})/i.exec(
      clean
    );
  if (labelled) {
    const val = parse(labelled[1]);
    if (val) return val;
  }

  // 3) Standalone currency value (peso sign or a large sensible price).
  const currency =
    /(?:₱|PHP|P)\s*([\d,]+(?:\.\d{1,2})?)/.exec(text);
  if (currency) {
    const val = parse(currency[1]);
    if (val) return val;
  }
  return null;
}

// Match the transaction time (HH:MM, optionally AM/PM). Prefers a time that sits
// right beside a date (e.g. "2025-07-02 09:23"), then falls back to any clock time.
// Returns "HH:MM" (24-hour) or "HH:MM AM/PM" (12-hour input) or null.
export function extractTime(text) {
  if (!text) return null;

  const to24Hour = (h, m, ampm) => {
    let hour = Number(h);
    const minute = Number(m);
    if (ampm) {
      const upper = ampm.toUpperCase();
      if (upper === "PM" && hour < 12) hour += 12;
      if (upper === "AM" && hour === 12) hour = 0;
    }
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  // 1) Date + time on the same line (the Treasury OR prints YYYY-MM-DD HH:MM).
  const withDate =
    /(\d{2,4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\s+(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i.exec(
      text
    );
  if (withDate) {
    const val = to24Hour(withDate[4], withDate[5], withDate[6]);
    if (val) return val;
  }

  // 2) Any standalone clock time.
  const plain = /\b(\d{1,2}):(\d{2})(?:\s*(am|pm))?\b/i.exec(text);
  if (plain) {
    return to24Hour(plain[1], plain[2], plain[3]);
  }

  return null;
}

// Match the payor/pet-owner name. The Treasury OR prints an account/TIN number
// followed by a dash and the name, e.g. "PAYOR: 1633123 - TRINIDAD, KAIZEN BRIX S."
// Only the name is returned — any leading account number / label is stripped.
// Returns the cleaned name or null.
export function extractOwnerName(text) {
  if (!text) return null;

  const cleanName = (value) => {
    let v = value
      .replace(/\s+/g, " ")
      .replace(/[|_=+*/\\]/g, "")
      .trim()
      // Drop any leading account/TIN number run (e.g. "1633123 - " or "1633123 NAME").
      .replace(/^\d[\d\s/.-]*\s*[-–—]?\s*/, "")
      .trim();
    if (v) v = v.replace(/[.,;:'"\s]+$/, "").trim();
    return v;
  };

  // 1) A "PAYOR:"/"Paid by:"/"Payee:" labelled row. The number (if any) comes
  //    before the name, so capture everything and strip the leading digits.
  const labelled =
    /(?:payor|paid\s+by|payee|received\s+from|received\s+the|name)\s*[:#.\s-]*([A-Z0-9][^\n]{3,120})/i.exec(
      text
    );
  if (labelled) {
    const val = cleanName(labelled[1]);
    if (val && val.length >= 4 && /[A-Z]{2,}/.test(val)) {
      // Guard against accidentally capturing the next table row.
      const cut = val.split(/\s+(consultat|vaccin|certificate|deworm|amount\b|medicine)/i)[0].trim();
      if (cut.length >= 4) return cut;
    }
  }

  // 2) "<numbers/ref> - NAME" pattern (the standard Treasury OR payor line,
  //    e.g. "1633123 - TRINIDAD, KAIZEN BRIX S.").
  const dashed =
    /(?:^|\n)\s*(?:\d{3,}[A-Za-z]*\s*[-–—]\s*)([A-Z][A-ZÀ-ÿ\s.,'-]{4,90}?)(?:\s*[-–—]|\n|$)/i.exec(
      text
    );
  if (dashed) {
    const val = cleanName(dashed[1]);
    if (val && val.length >= 4 && /[A-Z]{2,}/.test(val)) return val;
  }

  // 3) A line under "Office of ..." that is mostly uppercase letters (a name).
  const afterOffice =
    /(?:office\s+of\s+the[\s\S]{0,60}?\n)\s*([A-Z][A-ZÀ-ÿ.,' -]{4,90})/i.exec(
      text
    );
  if (afterOffice) {
    const val = cleanName(afterOffice[1]);
    if (val && /\d/.test(val) === false && val.length >= 4 && /[A-Z]{2,}/.test(val)) return val;
  }

  return null;
}

// Match the nature/particulars of the transaction (e.g. the line right under the
// "Nature of Account" header on the Treasury OR). Returns a short description or null.
export function extractNatureOfPayment(text) {
  if (!text) return null;

  // 1) A known service phrase is the most reliable, short extraction.
  const known =
    /(veterinary\s+services\s*[-–—]?\s*(?:consultation\s*fee|vaccination\s*fee|consultation|vaccination|medicine)?|consultation\s*fee|vaccination\s*fee|anti-?rabies\s+vaccination(?:s)?\s*fee?|deworming|(?:pet\s+)?medicine\s*fee)/i.exec(
      text
    );
  if (known) return known[0].trim();

  // 2) The line right under a "Nature of Account" / "Particulars" header, trimmed
  //    of any trailing numeric account code run (e.g. "5020101001  350.00").
  const underLabel =
    /(?:nature\s+of\s+account|particulars|description)\b[^\n]*\n\s*([A-Za-z][A-Za-z0-9\s.,/&'"()-]{3,90})/i.exec(
      text
    );
  if (underLabel) {
    const line = underLabel[1].trim();
    const cut = line.split(/\s+\d{4,}/)[0].trim();
    if (cut.length >= 3) return cut;
  }

  return null;
}

// Auto-detect the payment bucket from the OCR text so staff rarely needs to pick.
export function detectPaymentType(text) {
  if (!text) return null;

  const lower = text.toLowerCase();

  if (/vaccin/.test(lower) || /anti-?rabies/.test(lower)) return "Vaccination";
  if (/medicin|drug|pharmacy|antibiotic|deworm|vitamin/.test(lower)) return "Medicine";
  if (/consult|check[- ]up|clinic|examination|treatment/.test(lower)) return "Consultation";

  return null;
}

// Read the total from the "Amount Paid" row of the Treasury OR (the row under
// the "Nature of Certificate / True Copy" table). Falls back to the TOTAL-line
// logic in extractAmount when the label is not present.
// Returns a plain decimal string or null.
export function extractAmountPaid(text) {
  if (!text) return null;

  const parse = (captured) => {
    const digits = captured.replace(/[,\s]/g, "");
    const val = parseFloat(digits);
    if (Number.isFinite(val) && val > 0) return val.toFixed(2);
    return null;
  };

  // Find a line containing "Amount Paid" (OCR-safe spelling variants) and grab
  // the amount on that same line.
  const lineMatch =
    /(?:^|\n)\s*[^|\n]*?amt[a-z]*\s+paid[^0-9]*([\d,]+(?:\.\d{1,2})?)/i.exec(text);
  if (lineMatch) {
    const val = parse(lineMatch[1]);
    if (val) return val;
  }

  // Label appears right before the number on the same line.
  const labelled =
    /(?:amount\s+(?:paid|collected)|amt\s+paid)\s*[:.\s-]*\s*([\d,]+(?:\.\d{1,2})?)/i.exec(
      text
    );
  if (labelled) {
    const val = parse(labelled[1]);
    if (val) return val;
  }

  // Label sits above the number on the next line (phone photos often split rows).
  const nextLine =
    /(?:amount\s+(?:paid|collected)|amt\s+paid)[^\n]*\n[^0-9]*([\d,]+(?:\.\d{1,2})?)/i.exec(
      text
    );
  if (nextLine) {
    const val = parse(nextLine[1]);
    if (val) return val;
  }

  return extractAmount(text);
}

// Convert the written-out total ("TOTAL EIGHT HUNDRED FIFTY PESOS ONLY") into a
// number. The printed numeric total is so faint it is often missed, but the
// words are usually readable. Returns a plain number or null.
export function amountInWordsToNumber(text) {
  if (!text) return null;

  const match =
    /TOTAL\s+(.*?)\s+PESOS?(?:\s+ONLY)?/i.exec(text) ||
    /(?:AMOUNT\s+IN\s+WORDS|AMOUNT(?!\s+PAID))[^A-Z]*([A-Z][A-Z ]*?)\s+PESOS?(?:\s+ONLY)?/i.exec(text);
  if (!match) return null;

  const cleaned = match[1].toUpperCase().replace(/\bTOTAL\b|\bAMOUNT\b|\bIN\b|\bWORDS\b/g, ' ');
  if (!cleaned) return null;

  const singles = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
    fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  };
  const tens = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90,
  };

  const words = cleaned
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let total = 0;
  let current = 0;
  for (const word of words) {
    if (word in singles) {
      current += singles[word];
    } else if (word in tens) {
      current += tens[word];
    } else if (word === "hundred") {
      if (current === 0) return null; // "hundred" without a scale is invalid
      current *= 100;
    } else if (word === "thousand") {
      total += current * 1000;
      current = 0;
    } else if (word === "million") {
      total += current * 1000000;
      current = 0;
    } else {
      return null; // unrecognized word → not a clean amount phrase
    }
  }
  total += current;
  return total > 0 ? total : null;
}

// Build the list of payment line items from the Treasury OR. The header for the
// table is "Nature of Certificate" / "Certificate True Copy"; rows sit below it
// and stop right before the "Amount Paid" row. Each item looks like:
//   Veterinary Services - Consultation Fee 5020101001 350.00
//   Anti-rabies Vaccination                        250.00
// Returns [{ description, amount }] or null when nothing sensible is found.
export function extractPaymentDetails(text) {
  if (!text) return null;

  const lines = (text || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // Locate the table header line.
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/nature\s+of\s+certificate|certificate\s+true\s+copy|nature\s+of\s+account/i.test(lines[i])) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) start = 1; // relaxed fallback

  const items = [];

  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];

    // Stop at the Amount Paid row or the words total.
    if (/\b(?:amount\s+paid|amount\s+in\s+words|grand\s+total|total)\b/i.test(line)) break;
    if (/collected\s+by|copy\s+of\s+certificate|issued\s+by/i.test(line)) break;

    // Skip structural/header noise.
    if (
      !line ||
      line.length < 3 ||
      /^\d+$/.test(line) ||
      /\b(certificate|true copy|nature|account|office|republic|official receipt|collecting officer)\b/i.test(line) ||
      /^[|_.=\-]+$/.test(line)
    ) {
      continue;
    }

    // Amount at the end of the line (currency-style or plain decimal).
    const amountMatch = /(?:^|\s)([\d]{1,3}(?:,[\d]{3})*(?:\.\d{2})|[\d]+\.\d{2})(?:\s*$)/.exec(line);
    let amount = '';
    let rest = line;
    if (amountMatch) {
      amount = amountMatch[1].replace(/,/g, '');
      rest = line.slice(0, amountMatch.index).trim();
    }

    // Drop the account-code column (a bare 6-10 digit run, e.g. "5020101001").
    rest = rest.replace(/(?:^|\s)\d{6,10}(?=\s|$)/, '').trim();
    if (!rest && amount) rest = 'Cash Collection'; // amount but unreadable name
    if (!rest) continue;

    // Boilerplate / OCR-noise lines rarely have a price and never match a
    // service phrase — reject them. Real rows carry an amount or a known
    // service keyword, so a lone missed amount still keeps the item.
    const looksLikeService = /(consult|vaccin|rabies|deworm|medic|suppl|registration|certificat|fee|veterinar|antibiotic|vitamin|drug|treatment|exam)/i.test(rest);
    if (!amount && !looksLikeService) continue;

    if (items.length >= 15) break;
    items.push({ description: rest, amount });
  }

  if (items.length === 0) {
    const nature = extractNatureOfPayment(text);
    if (nature) items.push({ description: nature, amount: '' });
  }

  return items.length ? items : null;
}

// Convenience wrapper that runs all extractors over raw OCR text and (when
// available) the per-detection lines for layout-aware parsing.
//
//   parseOfficialReceipt(text)            -> text-only (Tesseract fallback path)
//   parseOfficialReceipt(text, lines)     -> spatial, row-aware (PaddleOCR path)
//
// Returns a flat object compatible with the old extractors plus per-field
// confidence / needs_review flags so the UI can highlight what to verify:
//   { or_number, amount, date, time, owner_name, nature, items, detected_type,
//     or_confidence, or_needs_review, date_confidence, date_needs_review,
//     owner_needs_review, amount_confidence, sum_matches, mismatch, table_start }
export function parseOfficialReceipt(text, lines) {
  if (!text) return null;
  const rows = groupIntoRows(lines);

  const orInfo = rows.length ? extractOrNumberFromRows(rows, text) : null;
  const ownerInfo = rows.length ? extractOwnerFromRows(rows) : null;
  const dateInfo = rows.length ? extractDateFromRows(rows, text) : null;
  const amountPaid = rows.length ? extractAmountPaidFromRows(rows, text) : null;

  const tableStart = rows.length ? findTableStart(rows) : -1;
  const items = rows.length && tableStart >= 0
    ? buildItemsFromRows(rows, tableStart)
    : extractPaymentDetails(text);

  let orNumber = orInfo ? orInfo.value : extractOrNumber(text);
  let ownerName = ownerInfo ? ownerInfo.value : extractOwnerName(text);
  let date = dateInfo ? dateInfo.value : extractDate(text);
  let time = dateInfo ? dateInfo.time : extractTime(text);
  const amount = amountPaid ? amountPaid.value : extractAmountPaid(text);

  // Item consistency vs the total (Amount Paid or words-only). Never patches —
  // just reports so the UI can ask the user to verify.
  const itemSum = (items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const refAmount = amount ? Number(amount) : null;
  const wordsTotal = amountInWordsToNumber(text);
  const totalRef = refAmount != null ? refAmount : wordsTotal || null;
  const sumMatches = totalRef != null
    ? Number.isFinite(itemSum) && Math.abs(itemSum - totalRef) <= 0.01
    : null;
  const mismatch = totalRef != null && sumMatches === false
    ? `Item total (₱${itemSum.toFixed(2)}) doesn't match ${wordsTotal && refAmount == null ? 'the written amount' : 'Amount Paid'} (₱${Number(totalRef).toFixed(2)}).`
    : null;

  const itemText = items && items.length ? items.map((i) => i.description).join(' ') : '';

  return {
    or_number: orNumber,
    or_confidence: orInfo ? orInfo.confidence : null,
    or_needs_review: orInfo ? orInfo.needs_review : !orNumber,
    amount,
    amount_confidence: amountPaid ? amountPaid.confidence : null,
    amount_missing: !amount,
    date,
    time,
    date_confidence: dateInfo ? dateInfo.confidence : null,
    date_needs_review: !date,
    owner_name: ownerName,
    owner_confidence: ownerInfo ? ownerInfo.confidence : null,
    owner_needs_review: (ownerInfo ? ownerInfo.needs_review : !ownerName) || !ownerName,
    nature: extractNatureOfPayment(text),
    items,
    detected_type: detectPaymentType(itemText || text),
    sum_matches: sumMatches,
    mismatch,
    words_total: wordsTotal,
    table_start: tableStart,
  };
}
