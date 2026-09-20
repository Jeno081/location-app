// ============================================
// incidents.js — Routes pour les incidents
// ============================================

const express = require("express");
const router = express.Router();
const incidentController = require("../../controllers/incidentController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

// Locataire : créer un incident et voir les siens
router.post("/", verifyToken, requireRole("locataire"), incidentController.createIncident);
router.get("/mes-incidents", verifyToken, requireRole("locataire"), incidentController.getMyIncidents);

// Bailleur : voir les incidents reçus et changer leur statut
router.get("/recus", verifyToken, requireRole("bailleur"), incidentController.getIncidentsForBailleur);
router.put("/:id/statut", verifyToken, requireRole("bailleur"), incidentController.updateIncidentStatus);

module.exports = router;