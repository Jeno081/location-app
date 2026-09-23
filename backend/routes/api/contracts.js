// ============================================
// contracts.js — Routes pour les contrats
// ============================================

const express = require("express");
const router = express.Router();
const contractController = require("../../controllers/contractController");
const contractPDFController = require("../../controllers/contractPDFController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

// Bailleur : créer un contrat + voir ses contrats
router.post("/", verifyToken, requireRole("bailleur"), contractController.createContract);
router.get("/mes-contrats", verifyToken, requireRole("bailleur"), contractController.getMyContractsAsBailleur);

// Locataire : voir ses contrats
router.get("/mes-locations", verifyToken, requireRole("locataire"), contractController.getMyContractsAsLocataire);

// Signature (les deux rôles)
router.put("/:id/signer", verifyToken, contractController.signContract);

// Téléchargement PDF (bailleur ET locataire du contrat)
router.get("/:id/pdf", verifyToken, contractPDFController.downloadContractPDF);

module.exports = router;