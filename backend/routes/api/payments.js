// ============================================
// payments.js — Routes pour les paiements
// ============================================

const express = require("express");
const router = express.Router();
const paymentController = require("../../controllers/paymentController");
const receiptPDFController = require("../../controllers/receiptPDFController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

// Locataire : créer un paiement + voir les siens
router.post("/", verifyToken, requireRole("locataire"), paymentController.createPayment);
router.get("/mes-paiements", verifyToken, requireRole("locataire"), paymentController.getMyPayments);

// Bailleur : voir les paiements reçus
router.get("/recus", verifyToken, requireRole("bailleur"), paymentController.getPaymentsForBailleur);

// Détail (les deux rôles)
router.get("/:id", verifyToken, paymentController.getPaymentById);

// Quittance PDF
router.get("/:id/quittance", verifyToken, receiptPDFController.downloadReceiptPDF);

module.exports = router;