const db = require("../config/db");

async function ensureMedicineStampColumns() {
  try {
    if (db.dialect === "postgres") {
      await db.query(
        "ALTER TABLE medicines ADD COLUMN IF NOT EXISTS stamp_color varchar(7)"
      );
      await db.query(
        "ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS stamp_color varchar(7)"
      );
      await db.query(
        "ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS expiry_date date"
      );
    } else {
      const [medicineColumns] = await db.query("SHOW COLUMNS FROM medicines");
      if (!medicineColumns.some((column) => column.Field === "stamp_color")) {
        await db.query(
          "ALTER TABLE medicines ADD COLUMN stamp_color VARCHAR(7) DEFAULT NULL"
        );
      }

      const [catalogColumns] = await db.query("SHOW COLUMNS FROM catalog_products");
      if (!catalogColumns.some((column) => column.Field === "stamp_color")) {
        await db.query(
          "ALTER TABLE catalog_products ADD COLUMN stamp_color VARCHAR(7) DEFAULT NULL"
        );
      }
      if (!catalogColumns.some((column) => column.Field === "expiry_date")) {
        await db.query(
          "ALTER TABLE catalog_products ADD COLUMN expiry_date DATE DEFAULT NULL"
        );
      }
    }

    console.log("✅ Medicine stamp color columns verified.");
    return true;
  } catch (error) {
    console.error("❌ Failed to ensure medicine stamp color columns:", error.message);
    return false;
  }
}

module.exports = { ensureMedicineStampColumns };
