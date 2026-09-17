// ============================================
// properties.js — Routes pour les logements
// ============================================

const express = require("express");
const router = express.Router();
const propertyController = require("../../controllers/propertyController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

// --- Routes PUBLIQUES (pas besoin d'être connecté) ---
router.get("/", propertyController.getAllProperties);
router.get("/:id", propertyController.getPropertyById);

// --- Routes PROTÉGÉES (bailleur connecté uniquement) ---
router.post(
  "/",
  verifyToken,
  requireRole("bailleur"),
  propertyController.createProperty
);

router.get(
  "/mes-logements/liste",
  verifyToken,
  requireRole("bailleur"),
  propertyController.getMyProperties
);

router.put(
  "/:id",
  verifyToken,
  requireRole("bailleur"),
  propertyController.updateProperty
);

router.delete(
  "/:id",
  verifyToken,
  requireRole("bailleur"),
  propertyController.deleteProperty
);

module.exports = router;