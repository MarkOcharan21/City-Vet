const db = require("../config/db");
const { logAudit } = require("../middleware/auditMiddleware");
const {
  defaultCatalogUnit,
  defaultCatalogExpiryDate,
  defaultCatalogBatchNumber,
} = require("../utils/catalogProductDefaults");

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

function parseStampColor(value) {
  if (value === undefined || value === null || value === "") return null;
  const color = String(value).trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : false;
}

function parseExpiryDate(value) {
  if (value === undefined || value === null || value === "") return null;
  const date = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return parsed.toISOString().slice(0, 10) === date ? date : false;
}

// GET /api/catalog  (Staff/Vet/Admin — the quick-pick menu grouped by category)
async function listCatalog(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT
        id, category, product_name, species, unit, subcategory, price, active, sort_order, medicine_id, stamp_color, batch_number,
        COALESCE(catalog_products.expiry_date,
          (SELECT m.expiry_date FROM medicines m WHERE m.id = catalog_products.medicine_id)
        ) AS expiry_date
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
        stamp_color: row.stamp_color || null,
        batch_number: row.batch_number || null,
        expiry_date: row.expiry_date || null,
        // Non-null means this stocked item also prescribes a medicine, so the
        // consultation form can add the charge and the dose in one click.
        medicine_id: row.medicine_id || null,
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
        id, category, product_name, species, unit, subcategory, price, active, sort_order, medicine_id, stamp_color, batch_number,
        COALESCE(catalog_products.expiry_date,
          (SELECT m.expiry_date FROM medicines m WHERE m.id = catalog_products.medicine_id)
        ) AS expiry_date
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
        medicine_id: row.medicine_id || null,
        stamp_color: row.stamp_color || null,
        batch_number: row.batch_number || null,
        expiry_date: row.expiry_date || null,
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
  const stampColor = parseStampColor(req.body.stamp_color);
  const expiryDate = parseExpiryDate(req.body.expiry_date);
  const batchNumber = String(req.body.batch_number || "").trim();
  const name = String(product_name || "").trim();
  const cat = String(category || "").trim();

  if (!name) {
    return res.status(400).json({ success: false, message: "Product name is required." });
  }
  if (!cat) {
    return res.status(400).json({ success: false, message: "Category is required." });
  }
  if (stampColor === false) {
    return res.status(400).json({ success: false, message: "Stamp color must be a 6-digit hex color." });
  }
  if (expiryDate === false) {
    return res.status(400).json({ success: false, message: "Expiry date must be a valid YYYY-MM-DD date." });
  }
  if (batchNumber.length > 80) {
    return res.status(400).json({ success: false, message: "Batch number must be 80 characters or fewer." });
  }
  if (
    cat !== "Consultation" &&
    Boolean(batchNumber) !== Boolean(expiryDate)
  ) {
    return res.status(400).json({
      success: false,
      message: "Enter both a batch number and expiry date, or leave both blank to generate clearly marked sample values.",
    });
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
    const defaultSeed = Date.now() * 100 + Number(maxSort) + 1;
    const effectiveExpiryDate =
      expiryDate || (cat === "Consultation" ? null : defaultCatalogExpiryDate(defaultSeed));
    const effectiveBatchNumber =
      batchNumber || (cat === "Consultation" ? null : defaultCatalogBatchNumber(defaultSeed));
    const [result] = await db.query(
      `INSERT INTO catalog_products
        (category, product_name, species, unit, subcategory, price, active, sort_order, stamp_color, expiry_date, batch_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cat,
        name,
        species || "General",
        unit || defaultCatalogUnit(cat, name),
        subcategory || (cat === "Consultation" ? "Check-up" : "General"),
        amount.toFixed(2),
        isActive ? 1 : 0,
        maxSort + 1,
        stampColor,
        effectiveExpiryDate,
        effectiveBatchNumber,
      ]
    );

    res.json({ success: true, message: `Catalog item "${name}" added.`, id: result.insertId });

    await logAudit(req, {
      action: "CREATE",
      entity_type: "catalog",
      entity_id: result.insertId,
      new_value: {
        category: cat,
        product_name: name,
        price: amount.toFixed(2),
        stamp_color: stampColor,
        batch_number: effectiveBatchNumber,
        expiry_date: effectiveExpiryDate,
      },
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
  const stampColor = parseStampColor(req.body.stamp_color);
  const expiryDate = parseExpiryDate(req.body.expiry_date);
  const batchNumber = req.body.batch_number === undefined
    ? undefined
    : String(req.body.batch_number || "").trim();

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
    if (stampColor === false) {
      return res.status(400).json({ success: false, message: "Stamp color must be a 6-digit hex color." });
    }
    if (expiryDate === false) {
      return res.status(400).json({ success: false, message: "Expiry date must be a valid YYYY-MM-DD date." });
    }
    if (batchNumber !== undefined && batchNumber.length > 80) {
      return res.status(400).json({ success: false, message: "Batch number must be 80 characters or fewer." });
    }
    const resultingBatchNumber = batchNumber === undefined ? existing.batch_number : batchNumber;
    const resultingExpiryDate = req.body.expiry_date === undefined ? existing.expiry_date : expiryDate;
    if (
      cat !== "Consultation" &&
      Boolean(resultingBatchNumber) !== Boolean(resultingExpiryDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter both a batch number and expiry date, or leave both blank to generate clearly marked sample values.",
      });
    }
    if (Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: "A valid price is required." });
    }

    const isActive =
      active !== undefined
        ? active === true || active === "true" || active === 1
        : !!existing.active;

    const effectiveUnit =
      unit !== undefined
        ? unit || defaultCatalogUnit(cat, name)
        : existing.unit || defaultCatalogUnit(cat, name);
    const effectiveSubcategory =
      subcategory !== undefined
        ? subcategory || (cat === "Consultation" ? "Check-up" : "General")
        : existing.subcategory || (cat === "Consultation" ? "Check-up" : "General");
    const replacingGeneratedBatch =
      /^DEMO-/i.test(String(batchNumber || "")) ||
      /^DEMO-/i.test(String(existing.batch_number || ""));
    const effectiveExpiryDate =
      replacingGeneratedBatch && req.body.expiry_date === undefined
        ? defaultCatalogExpiryDate(id)
        : req.body.expiry_date !== undefined
        ? expiryDate || (cat === "Consultation" ? null : defaultCatalogExpiryDate(id))
        : existing.expiry_date || (cat === "Consultation" ? null : defaultCatalogExpiryDate(id));
    const effectiveBatchNumber =
      batchNumber !== undefined
        ? !batchNumber
          ? (cat === "Consultation" ? null : defaultCatalogBatchNumber(id))
          : /^DEMO-/i.test(batchNumber)
            ? defaultCatalogBatchNumber(id)
            : batchNumber
        : /^DEMO-/i.test(String(existing.batch_number || ""))
          ? defaultCatalogBatchNumber(id)
          : existing.batch_number || (cat === "Consultation" ? null : defaultCatalogBatchNumber(id));

    await db.query(
      `UPDATE catalog_products SET
        category = ?, product_name = ?, species = ?, unit = ?, subcategory = ?,
        price = ?, active = ?, sort_order = ?, stamp_color = ?, expiry_date = ?, batch_number = ?
       WHERE id = ?`,
      [
        cat,
        name,
        species !== undefined ? species || "General" : existing.species || "General",
        effectiveUnit,
        effectiveSubcategory,
        amount.toFixed(2),
        isActive ? 1 : 0,
        sort_order !== undefined ? Number(sort_order) || 0 : existing.sort_order,
        req.body.stamp_color !== undefined ? stampColor : existing.stamp_color,
        effectiveExpiryDate,
        effectiveBatchNumber,
        id,
      ]
    );

    res.json({ success: true, message: `Catalog item "${name}" updated.`, id });

    await logAudit(req, {
      action: "UPDATE",
      entity_type: "catalog",
      entity_id: id,
      old_value: { product_name: existing.product_name, price: existing.price, active: existing.active, stamp_color: existing.stamp_color, batch_number: existing.batch_number, expiry_date: existing.expiry_date },
      new_value: {
        category: cat,
        product_name: name,
        price: amount.toFixed(2),
        active: isActive,
        stamp_color: req.body.stamp_color !== undefined ? stampColor : existing.stamp_color,
        batch_number: effectiveBatchNumber,
        expiry_date: effectiveExpiryDate,
      },
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

    // Check if this catalog item is referenced in existing consultation charges
    const [[refCount]] = await db.query(
      "SELECT COUNT(*) AS count FROM consultation_charges WHERE catalog_product_id = ?",
      [id]
    );
    if (Number(refCount.count) > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${existing.product_name}" — it is used in ${refCount.count} consultation charge record(s). Use "Deactivate" instead to hide it from new consultations while preserving history.`,
        referenced: true,
        referenceCount: Number(refCount.count),
      });
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
    // Handle FK constraint error from other references (e.g., payment_monitoring.payment_items JSON)
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === '23503') {
      return res.status(409).json({
        success: false,
        message: `Cannot delete "${existing?.product_name || 'this item'}" — it is referenced by existing records. Use "Deactivate" instead.`,
        referenced: true,
      });
    }
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