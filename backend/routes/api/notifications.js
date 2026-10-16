// ============================================
// notifications.js — Badges de notification
// ============================================

const express = require("express");
const router = express.Router();
const notificationController = require("../../controllers/notificationController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

router.get("/locataire", verifyToken, requireRole("locataire"), notificationController.getNotificationsLocataire);
router.get("/bailleur", verifyToken, requireRole("bailleur"), notificationController.getNotificationsBailleur);

module.exports = router;
