// ============================================
// properties.js — Routes pour les logements
// ============================================

const express = require("express");
const router = express.Router();
const propertyController = require("../../controllers/propertyController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");
const upload = require("../../middleware/uploadMiddleware");

// --- Routes PUBLIQUES ---
router.get("/", propertyController.getAllProperties);

// --- Routes protégées AVANT /:id ---
router.get(
  "/mes-logements/liste",
  verifyToken,
  requireRole("bailleur"),
  propertyController.getMyProperties
);

router.get(
  "/mes-locations",
  verifyToken,
  requireRole("locataire"),
  propertyController.getMesLocations
);

// --- Routes /:id ---
router.get("/:id", propertyController.getPropertyById);

router.post(
  "/",
  verifyToken,
  requireRole("bailleur"),
  propertyController.createProperty
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

// Upload de photos
router.post(
  "/:id/photos",
  verifyToken,
  requireRole("bailleur"),
  upload.array("photos", 5),
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Aucune photo envoyee" });
    }
    const propertyId = req.params.id;
    const bailleur_id = req.user.id;

    const db = require("../../database/db");
    const property = await db.get("SELECT * FROM properties WHERE id = ?", [propertyId]);

    if (!property) return res.status(404).json({ message: "Logement introuvable" });
    if (property.bailleur_id !== bailleur_id) return res.status(403).json({ message: "Non autorise" });

    const newPhotos = req.files.map(f => `/uploads/${f.filename}`);
    const existing = property.photos ? JSON.parse(property.photos) : [];
    const allPhotos = [...existing, ...newPhotos];

    await db.run("UPDATE properties SET photos = ? WHERE id = ?", [JSON.stringify(allPhotos), propertyId]);

    res.json({ message: "Photos ajoutees avec succes", photos: allPhotos });
  }
);

module.exports = router;