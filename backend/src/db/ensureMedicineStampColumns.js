const db = require("../config/db");
const {
  defaultCatalogUnit,
  defaultCatalogExpiryDate,
} = require("../utils/catalogProductDefaults");

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
      await db.query(
        "ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS batch_number varchar(80)"
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
      if (!catalogColumns.some((column) => column.Field === "batch_number")) {
        await db.query(
          "ALTER TABLE catalog_products ADD COLUMN batch_number VARCHAR(80) DEFAULT NULL"
        );
      }
    }

    const [products] = await db.query(
      `SELECT id, category, product_name, unit, subcategory, batch_number, expiry_date
       FROM catalog_products`
    );
    const seededExpiry = defaultCatalogExpiryDate();
    for (const product of products) {
      const isService = product.category === "Consultation";
      const batchNumber =
        String(product.batch_number || "").trim() ||
        (isService ? null : `DEMO-CP${product.id}`);
      const expiryDate = product.expiry_date || (isService ? null : seededExpiry);
      const unit = product.unit || defaultCatalogUnit(product.category, product.product_name);
      const subcategory = product.subcategory || (isService ? "Check-up" : "General");

      if (
        batchNumber !== product.batch_number ||
        expiryDate !== product.expiry_date ||
        unit !== product.unit ||
        subcategory !== product.subcategory
      ) {
        await db.query(
          `UPDATE catalog_products
           SET batch_number = ?, expiry_date = ?, unit = ?, subcategory = ?
           WHERE id = ?`,
          [batchNumber, expiryDate, unit, subcategory, product.id]
        );
      }
    }

    const [medicines] = await db.query(
      "SELECT id, expiry_date FROM medicines"
    );
    for (const medicine of medicines) {
      if (!medicine.expiry_date) {
        await db.query(
          "UPDATE medicines SET expiry_date = ? WHERE id = ?",
          [seededExpiry, medicine.id]
        );
      }
    }

    console.log("✅ Catalog stamp and product detail columns verified.");
    return true;
  } catch (error) {
    console.error("❌ Failed to ensure catalog stamp and inventory data:", error.message);
    throw error;
  }
}

module.exports = { ensureMedicineStampColumns };
