const fs = require("fs");
const path = require("path");

// The PaddleOCR sidecar runs on 127.0.0.1 (invoked from backend/ocr-service).
const OCR_URL = process.env.PADDLE_OCR_URL || "http://127.0.0.1:5001/ocr";
const OCR_TIMEOUT_MS = 60000;

/**
 * Send a receipt image (file path) to the PaddleOCR sidecar and return its JSON.
 * Returns { success, text, confidence, lines, engine, elapsed_ms }.
 * Throws on any failure so the caller can fall back to client-side OCR.
 */
async function ocrReceiptFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Receipt image not found: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase() || ".jpg";
  const mime = { ".png": "image/png", ".webp": "image/webp" }[ext] || "image/jpeg";

  const form = new FormData();
  form.append(
    "image",
    new Blob([buffer], { type: mime }),
    `receipt${ext}`
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  try {
    const response = await fetch(OCR_URL, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload || payload.success !== true) {
      const message = payload && payload.error ? payload.error : `OCR service responded ${response.status}`;
      throw new Error(message);
    }

    return payload;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { ocrReceiptFile };