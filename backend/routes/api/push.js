// ============================================
// push.js — Abonnements Web Push (FCM)
// ============================================

const express = require("express");
const router = express.Router();
const pushController = require("../../controllers/pushController");
const { verifyToken } = require("../../middleware/authMiddleware");

router.get("/health", pushController.health);
router.post("/subscribe", verifyToken, pushController.subscribe);
router.delete("/subscribe", verifyToken, pushController.unsubscribe);
router.get("/status", verifyToken, pushController.status);
router.post("/test", verifyToken, pushController.test);

module.exports = router;
