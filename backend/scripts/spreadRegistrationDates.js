// One-off demo helper: spreads existing pet registration dates across the
// Verify Registration date groups (Today / Earlier this week / Last week /
// Last month / Earlier this year / Earlier registrations) so each collapsible
// section has visible records. Safe to re-run: it only shifts dates.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const db = require("../src/config/db");

async function main() {
  const [pets] = await db.query(
    "SELECT id, created_at FROM pets ORDER BY created_at DESC"
  );

  if (!pets.length) {
    console.log("No pets found. Run seedOwnersPets.js first.");
    await db.end();
    return;
  }

  const now = new Date();
  const buckets = [
    { share: 0.08, offset: 0 },                 // Today
    { share: 0.14, offset: () => 1 + Math.floor(Math.random() * 6) },   // Earlier this week
    { share: 0.14, offset: () => 7 + Math.floor(Math.random() * 7) },   // Last week
    { share: 0.16, offset: () => 14 + Math.floor(Math.random() * 25) }, // Last month
    { share: 0.24, offset: () => 46 + Math.floor(Math.random() * 240) },// Earlier this year
    { share: 0.24, offset: () => 300 + Math.floor(Math.random() * 240) },// Earlier registrations
  ];

  let i = 0;
  let updated = 0;
  let bucketIndex = 0;
  for (const bucket of buckets) {
    bucketIndex += 1;
    const count = Math.max(1, Math.round(pets.length * bucket.share));
    const slice = pets.slice(i, i + count);
    i += count;

    for (const pet of slice) {
      const daysAgo =
        bucket.offset === 0 ? 0 : bucket.offset();
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      // Use local calendar date so records land in the right day group
      // regardless of the server's UTC offset.
      const pad = (n) => String(n).padStart(2, "0");
      const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      await db.query("UPDATE pets SET created_at = ? WHERE id = ?", [ts, pet.id]);
      updated += 1;
    }
    console.log(`Bucket ${bucketIndex}: assigned ${slice.length} pets`);
  }

  console.log(`\nDone. Updated ${updated} pet registration dates across ${buckets.length} date groups.`);
  await db.end();
}

main().catch(async (err) => {
  console.error("Failed:", err);
  try { await db.end(); } catch (_) {}
  process.exit(1);
});
