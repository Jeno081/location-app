// ============================================
// propertyController.js — Gestion des logements
// ============================================

const db = require("../database/db");

const STATUTS = ["disponible", "loue", "archive"];

function nombrePositif(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

exports.createProperty = (req, res) => {
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

  const result = db.prepare(`
    INSERT INTO properties (bailleur_id, titre, adresse, ville, loyer, charges, description, photos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, titre, adresse, ville, loyer, charges, description, photos ? JSON.stringify(photos) : null);

  res.status(201).json({ message: "Logement créé avec succès", propertyId: result.lastInsertRowid });
};

exports.getMyProperties = (req, res) => {
  const properties = db.prepare(`
    SELECT * FROM properties WHERE bailleur_id = ? ORDER BY date_creation DESC
  `).all(req.user.id);
  res.json({ properties });
};

exports.getAllProperties = (req, res) => {
  const properties = db.prepare(`
    SELECT p.id, p.titre, p.adresse, p.ville, p.loyer, p.charges, p.description, p.photos, p.statut,
           p.date_creation, u.nom AS bailleur_nom
    FROM properties p
    JOIN users u ON p.bailleur_id = u.id
    WHERE p.statut = 'disponible'
    ORDER BY p.date_creation DESC
  `).all();
  res.json({ properties });
};

exports.getPropertyById = (req, res) => {
  const property = db.prepare(`
    SELECT p.*, u.nom AS bailleur_nom, u.telephone AS bailleur_telephone
    FROM properties p
    JOIN users u ON p.bailleur_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!property) return res.status(404).json({ message: "Logement introuvable" });
  res.json({ property });
};

exports.updateProperty = (req, res) => {
  const property = db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id);
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

  db.prepare(`
    UPDATE properties
    SET titre = ?, adresse = ?, ville = ?, loyer = ?, charges = ?, description = ?, statut = ?
    WHERE id = ?
  `).run(titre, adresse, ville || null, loyer, charges, description || null, statut, property.id);

  res.json({ message: "Logement mis à jour avec succès" });
};

exports.deleteProperty = (req, res) => {
  const property = db.prepare("SELECT * FROM properties WHERE id = ?").get(req.params.id);
  if (!property) return res.status(404).json({ message: "Logement introuvable" });
  if (property.bailleur_id !== req.user.id) return res.status(403).json({ message: "Non autorisé" });

  const contrats = db.prepare("SELECT COUNT(*) AS nb FROM contracts WHERE property_id = ?").get(property.id).nb;
  if (contrats > 0) {
    return res.status(409).json({
      message: "Ce logement possède un historique de contrats. Archivez-le au lieu de le supprimer."
    });
  }
  const incidents = db.prepare("SELECT COUNT(*) AS nb FROM incidents WHERE property_id = ?").get(property.id).nb;
  if (incidents > 0) {
    return res.status(409).json({ message: "Ce logement possède des signalements. Archivez-le au lieu de le supprimer." });
  }

  db.prepare("DELETE FROM properties WHERE id = ?").run(property.id);
  res.json({ message: "Logement supprimé avec succès" });
};

exports.getMesLocations = (req, res) => {
  const properties = db.prepare(`
    SELECT p.*, c.id AS contract_id, c.date_debut, c.date_fin, c.montant_loyer,
           c.statut AS contract_statut, b.nom AS bailleur_nom, b.email AS bailleur_email,
           b.telephone AS bailleur_telephone
    FROM properties p
    JOIN contracts c ON c.property_id = p.id
    JOIN users b ON p.bailleur_id = b.id
    WHERE c.locataire_id = ? AND c.statut = 'actif'
    ORDER BY c.date_creation DESC
  `).all(req.user.id);
  res.json({ properties });
};
