// ============================================
// history.js — Historique du locataire
// ============================================

const express = require("express");
const router = express.Router();
const historyController = require("../../controllers/historyController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

router.get("/", verifyToken, requireRole("locataire"), historyController.getMyHistory);

module.exports = router;
