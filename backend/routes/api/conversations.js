// ============================================
// conversations.js — Demandes et messagerie
// ============================================

const express = require("express");
const router = express.Router();
const conversationController = require("../../controllers/conversationController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

router.get("/", verifyToken, conversationController.getConversations);
router.post("/", verifyToken, requireRole("locataire"), conversationController.createConversation);
router.get("/:id", verifyToken, conversationController.getConversation);
router.post("/:id/messages", verifyToken, conversationController.sendMessage);
router.put("/:id/statut", verifyToken, requireRole("bailleur"), conversationController.updateConversationStatus);

module.exports = router;
