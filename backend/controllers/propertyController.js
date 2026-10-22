// ============================================
// propertyController.js — Gestion des logements
// ============================================

const db = require("../database/db");
const { resolveStoredPath } = require("../utils/files");

const STATUTS = ["disponible", "loue", "archive"];

// Retire des tableaux `photos` les fichiers qui n'existent plus (anciens
// fichiers perdus lors des redéploiements Render).
async function filtrerPhotos(properties) {
  const rows = await db.all("SELECT path FROM files");
  const enBase = new Set(rows.map((row) => row.path));

  for (const property of properties) {
    if (!property.photos) continue;
    let photos = [];
    try { photos = JSON.parse(property.photos); } catch (err) { photos = []; }
    if (!Array.isArray(photos)) photos = [];
    property.photos = JSON.stringify(
      photos.filter((photo) => enBase.has(photo) || Boolean(resolveStoredPath(photo)))
    );
  }
  return properties;
}

function nombrePositif(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

exports.createProperty = async (req, res) => {
  const titre = String(req.body.titre || "").trim();
  const adresse = String(req.body.adresse || "").trim();
  const ville = req.body.ville ? String(req.body.ville).trim() : null;
  const description = req.body.description ? String(req.body.description).slice(0, 2000) : null;
  const loyer = Number(req.body.loyer);
  const charges = nombrePositif(req.body.charges, 0);
  const photos = Array.isArray(req.body.photos) ? req.body.photos.slice(0, 10) : null;

  if (!titre || !adresse || !Number.isFinite(loyer)) {
    return res.status(400).json({ message: "Titre, adresse et loyer sont obligatoires" });
  }
  if (titre.length > 120 || adresse.length > 200) {
    return res.status(400).json({ message: "Titre ou adresse trop long." });
  }
  if (loyer <= 0) return res.status(400).json({ message: "Le loyer doit être positif." });

  const result = await db.run(`
    INSERT INTO properties (bailleur_id, titre, adresse, ville, loyer, charges, description, photos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [req.user.id, titre, adresse, ville, loyer, charges, description, photos ? JSON.stringify(photos) : null]);

  res.status(201).json({ message: "Logement créé avec succès", propertyId: result.insertId });
};

exports.getMyProperties = async (req, res) => {
  const properties = await db.all(`
    SELECT * FROM properties WHERE bailleur_id = ? ORDER BY date_creation DESC
  `, [req.user.id]);
  await filtrerPhotos(properties);
  res.json({ properties });
};

exports.getAllProperties = async (req, res) => {
  const properties = await db.all(`
    SELECT p.id, p.titre, p.adresse, p.ville, p.loyer, p.charges, p.description, p.photos, p.statut,
           p.date_creation, u.nom AS bailleur_nom
    FROM properties p
    JOIN users u ON p.bailleur_id = u.id
    WHERE p.statut = 'disponible'
    ORDER BY p.date_creation DESC
  `);
  await filtrerPhotos(properties);
  res.json({ properties });
};

exports.getPropertyById = async (req, res) => {
  const property = await db.get(`
    SELECT p.*, u.nom AS bailleur_nom, u.telephone AS bailleur_telephone
    FROM properties p
    JOIN users u ON p.bailleur_id = u.id
    WHERE p.id = ?
  `, [req.params.id]);

  if (!property) return res.status(404).json({ message: "Logement introuvable" });
  await filtrerPhotos([property]);
  res.json({ property });
};

exports.updateProperty = async (req, res) => {
  const property = await db.get("SELECT * FROM properties WHERE id = ?", [req.params.id]);
  if (!property) return res.status(404).json({ message: "Logement introuvable" });
  if (property.bailleur_id !== req.user.id) return res.status(403).json({ message: "Non autorisé" });

  const titre = req.body.titre !== undefined ? String(req.body.titre).trim() : property.titre;
  const adresse = req.body.adresse !== undefined ? String(req.body.adresse).trim() : property.adresse;
  const ville = req.body.ville !== undefined ? String(req.body.ville || "").trim() : property.ville;
  const description = req.body.description !== undefined
    ? String(req.body.description || "").slice(0, 2000)
    : property.description;
  const loyer = req.body.loyer !== undefined ? Number(req.body.loyer) : property.loyer;
  const charges = req.body.charges !== undefined ? nombrePositif(req.body.charges, property.charges) : property.charges;
  const statut = req.body.statut !== undefined ? req.body.statut : property.statut;

  if (!titre || !adresse) return res.status(400).json({ message: "Titre et adresse obligatoires." });
  if (!Number.isFinite(loyer) || loyer <= 0) return res.status(400).json({ message: "Loyer invalide." });
  if (!STATUTS.includes(statut)) return res.status(400).json({ message: "Statut invalide." });

  await db.run(`
    UPDATE properties
    SET titre = ?, adresse = ?, ville = ?, loyer = ?, charges = ?, description = ?, statut = ?
    WHERE id = ?
  `, [titre, adresse, ville || null, loyer, charges, description || null, statut, property.id]);

  res.json({ message: "Logement mis à jour avec succès" });
};

exports.deleteProperty = async (req, res) => {
  const property = await db.get("SELECT * FROM properties WHERE id = ?", [req.params.id]);
  if (!property) return res.status(404).json({ message: "Logement introuvable" });
  if (property.bailleur_id !== req.user.id) return res.status(403).json({ message: "Non autorisé" });

  const contrats = await db.get("SELECT COUNT(*) AS nb FROM contracts WHERE property_id = ?", [property.id]);
  if (Number(contrats.nb) > 0) {
    return res.status(409).json({
      message: "Ce logement possède un historique de contrats. Archivez-le au lieu de le supprimer."
    });
  }
  const incidents = await db.get("SELECT COUNT(*) AS nb FROM incidents WHERE property_id = ?", [property.id]);
  if (Number(incidents.nb) > 0) {
    return res.status(409).json({ message: "Ce logement possède des signalements. Archivez-le au lieu de le supprimer." });
  }

  await db.run("DELETE FROM properties WHERE id = ?", [property.id]);
  res.json({ message: "Logement supprimé avec succès" });
};

exports.getMesLocations = async (req, res) => {
  const properties = await db.all(`
    SELECT p.*, c.id AS contract_id, c.date_debut, c.date_fin, c.montant_loyer,
           c.statut AS contract_statut, b.nom AS bailleur_nom, b.email AS bailleur_email,
           b.telephone AS bailleur_telephone
    FROM properties p
    JOIN contracts c ON c.property_id = p.id
    JOIN users b ON p.bailleur_id = b.id
    WHERE c.locataire_id = ? AND c.statut = 'actif'
    ORDER BY c.date_creation DESC
  `, [req.user.id]);
  await filtrerPhotos(properties);
  res.json({ properties });
};
