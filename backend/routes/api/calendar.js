// ============================================
// calendar.js — Routes pour le calendrier
// ============================================

const express = require("express");
const router = express.Router();
const calendarController = require("../../controllers/calendarController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

router.get("/", verifyToken, requireRole("bailleur"), calendarController.getCalendar);

module.exports = router;
