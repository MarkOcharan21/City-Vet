require("dotenv").config();
const db = require("../src/config/db");

async function main() {
  const [cols] = await db.query("SHOW COLUMNS FROM announcements LIKE 'image'");

  if (cols.length === 0) {
    await db.query(
      "ALTER TABLE announcements ADD COLUMN image VARCHAR(255) DEFAULT NULL AFTER message"
    );
    console.log("Added image column to announcements table.");
  } else {
    console.log("image column already exists.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
