// ============================================
// documents.js — Routes pour les documents
// ============================================

const express = require("express");
const router = express.Router();
const documentController = require("../../controllers/documentController");
const upload = require("../../middleware/documentUpload");
const { persistUploads } = require("../../services/fileStore");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

// Locataire
router.post("/", verifyToken, requireRole("locataire"), upload.single("fichier"), persistUploads, documentController.uploadDocument);
router.get("/mes-documents", verifyToken, requireRole("locataire"), documentController.getMesDocuments);

// Bailleur
router.get("/locataire/:id", verifyToken, requireRole("bailleur"), documentController.getDocumentsLocataire);
router.get("/:id/file", verifyToken, documentController.getDocumentFile);
router.put("/:id/statut", verifyToken, requireRole("bailleur"), documentController.updateDocumentStatus);

// Suppression (les deux rôles autorisés)
router.delete("/:id", verifyToken, documentController.deleteDocument);

module.exports = router;