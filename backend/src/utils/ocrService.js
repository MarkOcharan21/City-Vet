const fs = require("fs");
const path = require("path");

// In-process OCR using Tesseract.js (pure JS/WASM — no sidecar service).
// Replaces the old PaddleOCR Flask sidecar so the backend deploys as a single
// container on memory-constrained free tiers (e.g. Render free 512 MB).
//
// Response contract (unchanged from the sidecar): the controller maps it to
//   { success, engine, text, confidence, lines, elapsed_ms } and the frontend
//   feeding `parseOfficialReceipt(text, lines)`.

const LANG = "eng";
const OEM = 1; // LSTM-only, smallest + fastest for clean printed receipts
const TESSDATA_DIR = path.join(__dirname, "..", "..", "tessdata");
// Local preloaded traineddata (backend/tessdata/eng.traineddata) so the server
// never downloads language data at runtime. cacheMethod "none" keeps cold
// starts clean and the container filesystem read-only-safe.
let workerPromise = null;

function getWorker() {
  if (!workerPromise) {
    const { createWorker, PSM } = require("tesseract.js");
    workerPromise = createWorker(LANG, OEM, {
      langPath: TESSDATA_DIR,
      cachePath: TESSDATA_DIR,
      cacheMethod: "none",
      gzip: false, // local file is uncompressed eng.traineddata
      logger: () => {},
    })
      .then(async (worker) => {
        try {
          await worker.setParameters({
            tessedit_pageseg_mode: PSM.AUTO,
            preserve_interword_spaces: "1",
            tessedit_char_whitelist:
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;-/#&()₱P[]|_'",
          });
        } catch (_) {}
        return worker;
      })
      .catch((err) => {
        workerPromise = null;
        throw err;
      });
  }
  return workerPromise;
}

async function resetWorker() {
  if (workerPromise) {
    try {
      const w = await workerPromise;
      await w.terminate();
    } catch (_) {}
    workerPromise = null;
  }
}

// Tesseract returns pixel bboxes — the frontend's normLines() auto-rescales any
// "huge" coordinates to 0..1, so raw pixel polygons are a compatible contract.
function buildLines(blocks) {
  const out = [];
  for (const block of blocks || []) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        const text = (line.text || "").trim();
        if (!text) continue;
        const b = line.bbox || {};
        const x0 = Number.isFinite(b.x0) ? b.x0 : 0;
        const y0 = Number.isFinite(b.y0) ? b.y0 : 0;
        const x1 = Number.isFinite(b.x1) ? b.x1 : x0;
        const y1 = Number.isFinite(b.y1) ? b.y1 : y0;
        out.push({
          text,
          confidence: typeof line.confidence === "number" ? line.confidence : null,
          box: [
            [x0, y0],
            [x1, y0],
            [x1, y1],
            [x0, y1],
          ],
        });
      }
    }
  }
  return out;
}

async function ocrReceiptFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Receipt image not found: ${filePath}`);
  }

  const started = Date.now();
  const worker = await getWorker();
  try {
    const { data } = await worker.recognize(
      filePath,
      { rotateAuto: true },
      { text: true, blocks: true }
    );
    return {
      success: true,
      engine: "tesseract",
      text: typeof data.text === "string" ? data.text : "",
      confidence: typeof data.confidence === "number" ? data.confidence : null,
      lines: buildLines(data.blocks),
      elapsed_ms: Date.now() - started,
    };
  } catch (err) {
    // A crashed/OOM worker would poison every later call — rebuild once.
    await resetWorker();
    throw err;
  }
}

module.exports = { ocrReceiptFile };