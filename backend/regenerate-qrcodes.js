require('dotenv').config();

const db = require('./src/config/db');
const { regenerateQrImage } = require('./src/utils/qrGenerator');
const outreachQr = require('./src/utils/outreachQrGenerator');
const { writeReceiptQrImage } = require('./src/utils/qrReceipt');

async function closeDb() {
  try {
    await db.end();
  } catch (_) {}
}

// Regenerates every QR image in the system so the encoded URLs point at the
// current BACKEND_URL (e.g. after an IP / network change).
//   - pet QR codes      (qr_codes -> /qr/<token>)
//   - outreach programs (outreach_programs -> /oqr/<token>)
//   - outreach Txs      (outreach_transactions -> /oqr/<token>)
//   - pm receipts       (payment_monitoring -> /pm-receipt/<pm_token>)
async function regenerateAllQrImages({ log = console.log } = {}) {
  const counts = {
    pets: 0,
    outreachPrograms: 0,
    outreachTransactions: 0,
    paymentMonitoring: 0,
  };

  // 1) Pet QR codes
  const [petRows] = await db.query(`
    SELECT qc.qr_token, p.pet_code, p.name
    FROM qr_codes qc
    JOIN pets p ON qc.pet_id = p.id
    ORDER BY qc.id
  `);
  if (petRows.length === 0) {
    log('No pet QR codes found.');
  }
  for (const row of petRows) {
    const result = await regenerateQrImage(row.qr_token, row.pet_code);
    log(`✓ pet ${row.name} (${row.pet_code}) -> ${result.qrUrl}`);
    counts.pets++;
  }

  // 2) Outreach program QRs
  const [programs] = await db.query(
    "SELECT id, program_name, qr_token FROM outreach_programs WHERE qr_token IS NOT NULL"
  );
  if (programs.length === 0) {
    log('No outreach program QRs found.');
  }
  for (const p of programs) {
    const result = await outreachQr.generateOutreachQr(p.qr_token);
    await db.query("UPDATE outreach_programs SET qr_image_path = ? WHERE id = ?", [result.imagePath, p.id]);
    log(`✓ outreach program "${p.program_name}" -> ${result.qrUrl}`);
    counts.outreachPrograms++;
  }

  // 3) Outreach transaction QRs
  const [txs] = await db.query(
    "SELECT id, qr_token FROM outreach_transactions WHERE qr_token IS NOT NULL"
  );
  if (txs.length === 0) {
    log('No outreach transaction QRs found.');
  }
  for (const t of txs) {
    const result = await outreachQr.generateOutreachQr(t.qr_token);
    await db.query("UPDATE outreach_transactions SET qr_image_path = ? WHERE id = ?", [result.imagePath, t.id]);
    log(`✓ outreach transaction #${t.id} -> ${result.qrUrl}`);
    counts.outreachTransactions++;
  }

  // 4) Payment-monitoring receipt QRs
  const [pms] = await db.query(
    "SELECT id, pm_token FROM payment_monitoring WHERE pm_token IS NOT NULL"
  );
  if (pms.length === 0) {
    log('No payment-monitoring receipt QRs found.');
  }
  for (const r of pms) {
    const imagePath = await writeReceiptQrImage(r.pm_token);
    await db.query("UPDATE payment_monitoring SET receipt_qr_path = ? WHERE id = ?", [imagePath, r.id]);
    log(`✓ pm receipt #${r.id} -> ${imagePath}`);
    counts.paymentMonitoring++;
  }

  return counts;
}

async function main() {
  const origin = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  console.log(`Regenerating QR images using ${origin} ...\n`);
  const counts = await regenerateAllQrImages();
  console.log('\nDone. Same tokens kept — only the QR images were updated.');
  console.log('Summary:', counts);
  await closeDb();
  process.exit(0);
}

module.exports = { regenerateAllQrImages };

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed:', error.message);
    process.exit(1);
  });
}