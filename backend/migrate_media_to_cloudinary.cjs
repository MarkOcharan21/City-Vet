require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { uploadBuffer, cloudinaryConfigured } = require("./src/utils/cloudUpload");

const UPLOADS_ROOT = path.join(__dirname, "uploads");

const TARGETS = [
  { table: "pets", column: "photo", folder: "pet-vet/pets" },
  { table: "announcements", column: "image", folder: "pet-vet/announcements" },
  { table: "outreach_programs", column: "qr_image_path", folder: "pet-vet/qrcodes" },
  { table: "outreach_transactions", column: "qr_image_path", folder: "pet-vet/qrcodes" },
  { table: "payments", column: "qr_code_path", folder: "pet-vet/qrcodes" },
  { table: "payment_monitoring", column: "receipt_qr_path", folder: "pet-vet/qrcodes" },
  { table: "payment_monitoring", column: "or_photo_path", folder: "pet-vet/photos" },
];

function localFileFor(assetPath) {
  const rel = assetPath.replace(/^\/uploads[/\\]/, "");
  const abs = path.join(UPLOADS_ROOT, rel);
  return fs.existsSync(abs) ? abs : null;
}

function publicIdFor(absPath) {
  return path
    .relative(UPLOADS_ROOT, absPath)
    .replace(/\\/g, "/")
    .replace(/\.[^.]+$/, "");
}

(async () => {
  if (!cloudinaryConfigured) {
    console.error("FATAL: Cloudinary not configured. Aborting.");
    process.exit(1);
  }

  const pg = new Pool({
    connectionString: process.env.DATABASE_URL_POOLER,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });

  let grandTotal = 0;
  let grandFailed = 0;
  const missing = [];

  for (const t of TARGETS) {
    const { rows } = await pg.query(
      `SELECT ctid::text AS rid, "${t.column}" AS asset FROM "${t.table}" WHERE "${t.column}" IS NOT NULL`
    );
    const local = rows.filter((r) => typeof r.asset === "string" && r.asset.startsWith("/uploads/"));
    if (!local.length) {
      console.log(`${t.table}.${t.column}: nothing local`);
      continue;
    }

    let ok = 0;
    let failed = 0;

    for (const r of local) {
      const abs = localFileFor(r.asset);
      if (!abs) {
        missing.push(`${t.table}.${t.column} ${r.asset}`);
        failed += 1;
        continue;
      }
      try {
        const url = await uploadBuffer(fs.readFileSync(abs), {
          folder: t.folder,
          publicId: publicIdFor(abs),
        });
        if (!url) throw new Error("no URL returned");
        await pg.query(
          `UPDATE "${t.table}" SET "${t.column}" = $1 WHERE ctid = $2::tid`,
          [url, r.rid]
        );
        ok += 1;
      } catch (e) {
        failed += 1;
        console.warn(`  ${t.table}.${t.column} failed: ${e.message}`);
      }
    }

    grandTotal += ok;
    grandFailed += failed;
    console.log(`${t.table}.${t.column}: uploaded=${ok} failed=${failed}`);
  }

  console.log(`\ntotal uploaded: ${grandTotal}, failed: ${grandFailed}`);
  if (missing.length) {
    console.log(`local files missing on disk (${missing.length}):`);
    missing.forEach((m) => console.log(`  ${m}`));
  }

  // Final verification done in JS to avoid the nondeterministic-collation issue.
  console.log("\n--- verification ---");
  for (const t of TARGETS) {
    const { rows } = await pg.query(`SELECT "${t.column}" AS asset FROM "${t.table}"`);
    const left = rows.filter(
      (r) => typeof r.asset === "string" && r.asset.startsWith("/uploads/")
    ).length;
    const cloud = rows.filter((r) => typeof r.asset === "string" && r.asset.includes("cloudinary.com")).length;
    console.log(`${t.table}.${t.column}: cloudinary=${cloud} stillLocal=${left}`);
  }

  await pg.end();
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});