// ============================================
// announcements.js — Annonces du bailleur
// ============================================

const express = require("express");
const router = express.Router();
const announcementController = require("../../controllers/announcementController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

router.get("/", verifyToken, announcementController.getAnnouncements);
router.post("/", verifyToken, requireRole("bailleur"), announcementController.createAnnouncement);

module.exports = router;
