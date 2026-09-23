// ============================================
// properties.js — Routes pour les logements
// ============================================

const express = require("express");
const router = express.Router();
const propertyController = require("../../controllers/propertyController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");
const upload = require("../../middleware/uploadMiddleware");

// --- Routes PUBLIQUES (pas besoin d'être connecté) ---
router.get("/", propertyController.getAllProperties);
router.get("/:id", propertyController.getPropertyById);

// --- Routes PROTÉGÉES (bailleur connecté uniquement) ---
router.post(
  "/",
  verifyToken,
  requireRole("bailleur"),
  propertyController.createProperty
);

router.get(
  "/mes-logements/liste",
  verifyToken,
  requireRole("bailleur"),
  propertyController.getMyProperties
);

router.put(
  "/:id",
  verifyToken,
  requireRole("bailleur"),
  propertyController.updateProperty
);

router.delete(
  "/:id",
  verifyToken,
  requireRole("bailleur"),
  propertyController.deleteProperty
);

// Upload de photos pour un logement (bailleur connecté)
router.post(
  "/:id/photos",
  verifyToken,
  requireRole("bailleur"),
  upload.array("photos", 5), // 5 photos max
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Aucune photo envoyee" });
    }

    const propertyId = req.params.id;
    const bailleur_id = req.user.id;

    // Vérifier que le logement appartient au bailleur
    const db = require("../../database/db");
    const property = db.prepare("SELECT * FROM properties WHERE id = ?").get(propertyId);

    if (!property) {
      return res.status(404).json({ message: "Logement introuvable" });
    }
    if (property.bailleur_id !== bailleur_id) {
      return res.status(403).json({ message: "Non autorise" });
    }

    // Construire les URLs des photos
    const newPhotos = req.files.map(f => `/uploads/${f.filename}`);

    // Fusionner avec les photos existantes
    const existing = property.photos ? JSON.parse(property.photos) : [];
    const allPhotos = [...existing, ...newPhotos];

    db.prepare("UPDATE properties SET photos = ? WHERE id = ?")
      .run(JSON.stringify(allPhotos), propertyId);

    res.json({
      message: "Photos ajoutees avec succes",
      photos: allPhotos
    });
  }
);

module.exports = router;