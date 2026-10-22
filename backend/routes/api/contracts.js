// ============================================
// contracts.js
// ============================================

const express = require("express");
const router = express.Router();
const contractController = require("../../controllers/contractController");
const contractPDFController = require("../../controllers/contractPDFController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

router.post("/", verifyToken, requireRole("bailleur"), contractController.createContract);
router.get("/mes-contrats", verifyToken, requireRole("bailleur"), contractController.getMyContractsAsBailleur);
router.get("/mes-locations", verifyToken, requireRole("locataire"), contractController.getMyContractsAsLocataire);
router.put("/:id/signer", verifyToken, contractController.signContract);
router.put("/:id/clauses", verifyToken, requireRole("bailleur"), contractController.updateClauses);
router.put("/:id/terminer", verifyToken, requireRole("bailleur"), contractController.terminerContrat);
router.put("/:id/renouveler", verifyToken, requireRole("bailleur"), contractController.renouvelerContrat);
router.get("/:id/pdf", verifyToken, contractPDFController.downloadContractPDF);

module.exports = router;
