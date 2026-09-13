const db = require("../config/db");

/**
 * Middleware: requires the authenticated owner to have at least one
 * verified Registration Fee payment before accessing the route.
 */
async function requireVerifiedRegistration(req, res, next) {
  try {
    const [[ownerRow]] = await db.query(
      "SELECT id FROM pet_owners WHERE user_id = ?",
      [req.user.id]
    );
    if (!ownerRow) {
      return res.status(404).json({ success: false, message: "Pet owner profile not found." });
    }

    const [[verified]] = await db.query(
      `SELECT py.id FROM payments py
       WHERE py.pet_owner_id = ?
         AND py.payment_type_id = 1
         AND py.validation_status = 'Verified'
       LIMIT 1`,
      [ownerRow.id]
    );

    if (!verified) {
      return res.status(403).json({
        success: false,
        message: "Settle your registration fee first at the City Treasury before requesting services.",
      });
    }

    next();
  } catch (error) {
    console.error("Payment lock check error:", error);
    res.status(500).json({ success: false, message: "Could not verify payment status." });
  }
}

module.exports = requireVerifiedRegistration;
