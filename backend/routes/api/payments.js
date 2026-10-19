// ============================================
// payments.js — Routes pour les paiements
// ============================================

const express = require("express");
const router = express.Router();
const paymentController = require("../../controllers/paymentController");
const receiptPDFController = require("../../controllers/receiptPDFController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");
const upload = require("../../middleware/documentUpload"); // Réutilise multer

// ⚠️ Routes spécifiques AVANT les routes /:id

// Locataire
router.post(
  "/", 
  verifyToken, 
  requireRole("locataire"), 
  upload.single("preuve"), // Le nom "preuve" correspond au name du FormData
  paymentController.createPayment
);
router.get("/mes-paiements", verifyToken, requireRole("locataire"), paymentController.getMyPayments);
router.get("/mes-rappels", verifyToken, requireRole("locataire"), paymentController.getMesRappels);
router.put("/rappels/:id/lu", verifyToken, requireRole("locataire"), paymentController.marquerRappelLu);

// Bailleur
router.get("/recus", verifyToken, requireRole("bailleur"), paymentController.getPaymentsForBailleur);
router.get("/tableau-de-bord", verifyToken, requireRole("bailleur"), paymentController.getDashboard);
router.post("/rappel", verifyToken, requireRole("bailleur"), paymentController.envoyerRappel);
router.get("/export-csv", verifyToken, requireRole("bailleur"), paymentController.exportCSV);
router.put("/:id/valider", verifyToken, requireRole("bailleur"), paymentController.validerPaiement);

// Détail (avec :id en dernier)
router.get("/:id/preuve", verifyToken, paymentController.getPaymentProof);
router.get("/:id", verifyToken, paymentController.getPaymentById);
router.get("/:id/quittance", verifyToken, receiptPDFController.downloadReceiptPDF);

module.exports = router;