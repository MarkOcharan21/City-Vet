const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  getPrograms,
  createProgram,
  getProgram,
  updateProgram,
  deleteProgram,
  getSummary,
  generateProgramQr,
  listTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  verifyTransaction,
  rejectTransaction,
  getQrFormData,
  submitQrForm,
  lookupPetByCode,
} = require("../controllers/outreachController");

const staffRoles = ["Staff", "Veterinarian", "Admin"];

// Public — owner confirmation form (no auth)
router.get("/qr/lookup-pet", lookupPetByCode);
router.get("/qr/:token", getQrFormData);
router.post("/qr/:token/submit", submitQrForm);

// Staff-scoped
router.get("/summary", auth, requireRole(staffRoles), getSummary);
router.get("/", auth, requireRole(staffRoles), getPrograms);
router.post("/", auth, requireRole(staffRoles), createProgram);

router.get("/:id", auth, requireRole(staffRoles), getProgram);
router.put("/:id", auth, requireRole(staffRoles), updateProgram);
router.delete("/:id", auth, requireRole(staffRoles), deleteProgram);
router.get("/:id/summary", auth, requireRole(staffRoles), getSummary);
router.get("/:id/transactions", auth, requireRole(staffRoles), listTransactions);
router.post("/:id/generate-qr", auth, requireRole(staffRoles), generateProgramQr);

router.post("/transactions/:id/verify", auth, requireRole(staffRoles), verifyTransaction);
router.post("/transactions/:id/reject", auth, requireRole(staffRoles), rejectTransaction);
router.get("/transactions/:id", auth, requireRole(staffRoles), getTransaction);
router.put("/transactions/:id", auth, requireRole(staffRoles), updateTransaction);
router.delete("/transactions/:id", auth, requireRole(staffRoles), deleteTransaction);

module.exports = router;