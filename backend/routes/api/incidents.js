// ============================================
// incidents.js
// ============================================

const express = require("express");
const router = express.Router();
const incidentController = require("../../controllers/incidentController");
const upload = require("../../middleware/documentUpload");
const { persistUploads } = require("../../services/fileStore");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");

router.post(
  "/",
  verifyToken,
  requireRole("locataire"),
  upload.array("photos", 10),
  persistUploads,
  incidentController.createIncident
);

router.get("/mes-incidents", verifyToken, requireRole("locataire"), incidentController.getMyIncidents);
router.get("/recus", verifyToken, requireRole("bailleur"), incidentController.getIncidentsForBailleur);
router.get("/:id/photo", verifyToken, incidentController.getIncidentPhoto);
router.put("/:id/statut", verifyToken, requireRole("bailleur"), incidentController.updateIncidentStatus);

module.exports = router;
