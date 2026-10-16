// ============================================
// charts.js — Routes pour les graphiques
// ============================================

const express = require("express");
const router = express.Router();
const chartController = require("../../controllers/chartController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

router.get("/revenus", verifyToken, requireRole("bailleur"), chartController.getRevenus);
router.get("/repartition", verifyToken, requireRole("bailleur"), chartController.getRepartition);

module.exports = router;
