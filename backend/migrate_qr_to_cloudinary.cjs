require("dotenv").config();

const LIVE_BACKEND = process.env.QR_LIVE_BACKEND_URL || "https://city-vet-system.onrender.com";
const BATCH_SIZE = 10;
const CONCURRENCY = 5;

process.env.BACKEND_URL = LIVE_BACKEND;

const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");

const { uploadBuffer, cloudinaryConfigured } = require("./src/utils/cloudUpload");
const QRCode = require("qrcode");

const LOCAL_DIR = path.join(__dirname, "uploads", "qrcodes");
const PROGRESS_FILE = path.join(__dirname, ".qr_migration_progress.json");

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
  } catch (_) {
    return { done: {}, startedAt: new Date().toISOString(), backend: LIVE_BACKEND };
  }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p));
}

async function uploadLocalImage(filePath, publicId) {
  const result = await uploadBuffer(fs.readFileSync(filePath), {
    folder: "pet-vet/qrcodes",
    publicId,
  });
  return result;
}

async function regenerateAndUpload(row) {
  const publicId = `qr_${row.pet_code}`;

  // Preferred: regenerate so the embedded URL points at the live Render host.
  const buffer = await QRCode.toBuffer(`${LIVE_BACKEND}/qr/${encodeURIComponent(row.qr_token)}`, {
    width: 300,
  });
  let url = await uploadBuffer(buffer, { folder: "pet-vet/qrcodes", publicId });

  // Fallback: the previously generated local PNG (same public_id => same asset).
  if (!url) {
    const localFile = path.join(LOCAL_DIR, path.basename(row.image_path || ""));
    if (fs.existsSync(localFile)) url = await uploadLocalImage(localFile, publicId);
  }

  if (!url) throw new Error("upload returned no URL");
  return url;
}

(async () => {
  if (!cloudinaryConfigured) {
    console.error("FATAL: Cloudinary is not configured (check .env). Aborting.");
    process.exit(1);
  }
  console.log(`Live backend URL baked into QR: ${LIVE_BACKEND}`);

  const pg = new Pool({
    connectionString: process.env.DATABASE_URL_POOLER,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });

  const { rows } = await pg.query(
    `SELECT q.id, q.qr_token, q.image_path, p.pet_code
       FROM qr_codes q
       JOIN pets p ON p.id = q.pet_id
      ORDER BY q.id`
  );
  console.log(`Total QR codes: ${rows.length}`);

  const progress = loadProgress();
  const pending = rows.filter((r) => !progress.done[r.id]);
  console.log(`Already migrated: ${rows.length - pending.length}, pending: ${pending.length}`);

  let ok = 0;
  const failures = [];

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const slice = pending.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      slice.map(async (row) => {
        const url = await regenerateAndUpload(row);
        await pg.query(`UPDATE qr_codes SET image_path = $1 WHERE id = $2`, [url, row.id]);
        progress.done[row.id] = url;
        return url;
      })
    );

    settled.forEach((s, idx) => {
      const row = slice[idx];
      if (s.status === "fulfilled") {
        ok += 1;
      } else {
        failures.push({ id: row.id, token: row.qr_token, error: s.reason.message });
      }
    });

    saveProgress(progress);
    const doneCount = i + slice.length;
    console.log(
      `[${doneCount}/${pending.length}] ok=${ok} failed=${failures.length} last=${settled
        .map((s) => (s.status === "fulfilled" ? "Y" : "N"))
        .join("")}`
    );

    if (BATCH_SIZE && doneCount % 100 === 0) await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n--- result ---");
  console.log(`migrated: ${ok}, failed: ${failures.length}`);
  if (failures.length) {
    console.log("failures:", JSON.stringify(failures.slice(0, 20), null, 1));
  }

  const check = await pg.query(
    `SELECT count(*) FILTER (WHERE image_path LIKE 'http%') AS cloud,
            count(*) FILTER (WHERE image_path LIKE '/uploads/%') AS local
       FROM qr_codes`
  );
  console.log("db state:", check.rows[0]);

  await pg.end();
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});