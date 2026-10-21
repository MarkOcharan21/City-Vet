const db = require("../config/db");

async function ensureConsultationService() {
  const [products] = await db.query(
    `SELECT id
     FROM catalog_products
     WHERE category = ? AND product_name IN (?, ?)
     ORDER BY CASE WHEN product_name = ? THEN 0 ELSE 1 END, id ASC`,
    ["Consultation", "Consultation Service", "Consultation Fee", "Consultation Service"],
  );

  if (products.length) {
    const [service, ...duplicates] = products;
    await db.query(
      `UPDATE catalog_products
       SET product_name = ?, price = ?, active = 1
       WHERE id = ?`,
      ["Consultation Service", "20.00", service.id],
    );

    for (const duplicate of duplicates) {
      await db.query("UPDATE catalog_products SET active = 0 WHERE id = ?", [duplicate.id]);
    }
    return true;
  }

  const [[{ max_sort: maxSort }]] = await db.query(
    "SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM catalog_products WHERE category = ?",
    ["Consultation"],
  );
  await db.query(
    `INSERT INTO catalog_products
      (category, product_name, species, unit, subcategory, price, active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ["Consultation", "Consultation Service", "General", null, "Check-up", "20.00", 1, maxSort + 1],
  );
  return true;
}

module.exports = { ensureConsultationService };
