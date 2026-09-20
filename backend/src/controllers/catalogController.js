const db = require("../config/db");
const { logAudit } = require("../middleware/auditMiddleware");

// Category → payment type classification. Vaccines are a vaccination fee, the
// consultation items are consultation fees, everything else is a medicine item.
const CATEGORY_PAYMENT_TYPE = {
  Vaccines: "Vaccination",
  Consultation: "Consultation",
  "Dewormers / Antiparasitics": "Medicine",
  "Vitamins / Supplements": "Medicine",
  "Common Medicines": "Medicine",
  "Topical / Wound Care": "Medicine",
  "Other Supplies": "Medicine",
};

function paymentTypeForCategory(category) {
  return CATEGORY_PAYMENT_TYPE[category] || "Medicine";
}

// GET /api/catalog  (Staff/Vet/Admin — the quick-pick menu grouped by category)
async function listCatalog(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT
        id, category, product_name, species, unit, subcategory, price, active, sort_order
       FROM catalog_products
       WHERE active = 1
       ORDER BY category ASC, sort_order ASC, product_name ASC`
    );

    const groups = {};
    rows.forEach((row) => {
      (groups[row.category] = groups[row.category] || []).push({
        id: row.id,
        name: row.product_name,
        species: row.species || "General",
        unit: row.unit || null,
        subcategory: row.subcategory || null,
        price: row.price,
      });
    });

    const categories = Object.keys(groups).map((name) => ({
      name,
      payment_type: paymentTypeForCategory(name),
      products: groups[name],
    }));

    res.json({ success: true, categories });
  } catch (error) {
    console.error("List catalog error:", error);
    res.status(500).json({ success: false, message: "Could not load the product catalog.", error: error.message });
  }
}

// GET /api/catalog/categories  (Admin management view — includes inactive + edit flags)
async function listCatalogAdmin(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT
        id, category, product_name, species, unit, subcategory, price, active, sort_order
       FROM catalog_products
       ORDER BY category ASC, sort_order ASC, product_name ASC`
    );

    const groups = {};
    rows.forEach((row) => {
      (groups[row.category] = groups[row.category] || []).push({
        id: row.id,
        name: row.product_name,
        species: row.species || "General",
        unit: row.unit || null,
        subcategory: row.subcategory || null,
        price: row.price,
        active: !!row.active,
      });
    });

    const categories = Object.keys(groups).map((name) => ({
      name,
      payment_type: paymentTypeForCategory(name),
      products: groups[name],
    }));

    res.json({ success: true, categories });
  } catch (error) {
    console.error("List catalog (admin) error:", error);
    res.status(500).json({ success: false, message: "Could not load the product catalog.", error: error.message });
  }
}

// POST /api/catalog  (Admin only)
async function createCatalogItem(req, res) {
  const { category, product_name, species, unit, subcategory, price, active } = req.body;
  const name = String(product_name || "").trim();
  const cat = String(category || "").trim();

  if (!name) {
    return res.status(400).json({ success: false, message: "Product name is required." });
  }
  if (!cat) {
    return res.status(400).json({ success: false, message: "Category is required." });
  }
  const amount = Number.parseFloat(price);
  if (Number.isNaN(amount) || amount < 0) {
    return res.status(400).json({ success: false, message: "A valid price is required." });
  }
  const isActive = active === undefined || active === true || active === "true" || active === 1;

  try {
    const [[{ n: maxSort }]] = await db.query(
      "SELECT COALESCE(MAX(sort_order), 0) AS n FROM catalog_products WHERE category = ?",
      [cat]
    );
    const [result] = await db.query(
      `INSERT INTO catalog_products
        (category, product_name, species, unit, subcategory, price, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [cat, name, species || "General", unit || null, subcategory || null, amount.toFixed(2), isActive ? 1 : 0, maxSort + 1]
    );

    res.json({ success: true, message: `Catalog item "${name}" added.`, id: result.insertId });

    await logAudit(req, {
      action: "CREATE",
      entity_type: "catalog",
      entity_id: result.insertId,
      new_value: { category: cat, product_name: name, price: amount.toFixed(2) },
      description: `Added catalog product "${name}" (${cat}) — ₱${amount.toFixed(2)}`,
    });
  } catch (error) {
    console.error("Create catalog item error:", error);
    res.status(500).json({ success: false, message: "Could not add the catalog item.", error: error.message });
  }
}

// PUT /api/catalog/:id  (Admin only)
async function updateCatalogItem(req, res) {
  const { id } = req.params;
  const { category, product_name, species, unit, subcategory, price, active, sort_order } = req.body;

  try {
    const [[existing]] = await db.query("SELECT * FROM catalog_products WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Catalog item not found." });
    }

    const name = product_name !== undefined ? String(product_name).trim() : existing.product_name;
    const cat = category !== undefined ? String(category).trim() : existing.category;
    const amount =
      price !== undefined && price !== "" && price !== null
        ? Number.parseFloat(price)
        : Number(existing.price);
    if (!name) {
      return res.status(400).json({ success: false, message: "Product name is required." });
    }
    if (!cat) {
      return res.status(400).json({ success: false, message: "Category is required." });
    }
    if (Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: "A valid price is required." });
    }

    const isActive =
      active !== undefined
        ? active === true || active === "true" || active === 1
        : !!existing.active;

    await db.query(
      `UPDATE catalog_products SET
        category = ?, product_name = ?, species = ?, unit = ?, subcategory = ?,
        price = ?, active = ?, sort_order = ?
       WHERE id = ?`,
      [
        cat,
        name,
        species !== undefined ? species || "General" : existing.species || "General",
        unit !== undefined ? unit || null : existing.unit,
        subcategory !== undefined ? subcategory || null : existing.subcategory,
        amount.toFixed(2),
        isActive ? 1 : 0,
        sort_order !== undefined ? Number(sort_order) || 0 : existing.sort_order,
        id,
      ]
    );

    res.json({ success: true, message: `Catalog item "${name}" updated.`, id });

    await logAudit(req, {
      action: "UPDATE",
      entity_type: "catalog",
      entity_id: id,
      old_value: { product_name: existing.product_name, price: existing.price, active: existing.active },
      new_value: { category: cat, product_name: name, price: amount.toFixed(2), active: isActive },
      description: `Updated catalog product "${name}"`,
    });
  } catch (error) {
    console.error("Update catalog item error:", error);
    res.status(500).json({ success: false, message: "Could not update the catalog item.", error: error.message });
  }
}

// DELETE /api/catalog/:id  (Admin only)
async function deleteCatalogItem(req, res) {
  const { id } = req.params;
  try {
    const [[existing]] = await db.query("SELECT * FROM catalog_products WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Catalog item not found." });
    }
    await db.query("DELETE FROM catalog_products WHERE id = ?", [id]);
    res.json({ success: true, message: `Catalog item "${existing.product_name}" removed.` });

    await logAudit(req, {
      action: "DELETE",
      entity_type: "catalog",
      entity_id: id,
      old_value: { product_name: existing.product_name, price: existing.price },
      description: `Removed catalog product "${existing.product_name}"`,
    });
  } catch (error) {
    console.error("Delete catalog item error:", error);
    res.status(500).json({ success: false, message: "Could not remove the catalog item.", error: error.message });
  }
}

module.exports = {
  listCatalog,
  listCatalogAdmin,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  paymentTypeForCategory,
};