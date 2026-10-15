// ============================================
// propertyController.js — Gestion des logements
// ============================================

const db = require("../database/db");

// ============================================
// CRÉER un logement — POST /api/properties
// (réservé au bailleur)
// ============================================
exports.createProperty = (req, res) => {
  const { titre, adresse, ville, loyer, charges, description, photos } = req.body;
  const bailleur_id = req.user.id; // Récupéré depuis le token JWT

  // Vérification des champs obligatoires
  if (!titre || !adresse || !loyer) {
    return res.status(400).json({ message: "Titre, adresse et loyer sont obligatoires" });
  }

  // Insertion en base
  const result = db.prepare(`
    INSERT INTO properties (bailleur_id, titre, adresse, ville, loyer, charges, description, photos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    bailleur_id,
    titre,
    adresse,
    ville || null,
    loyer,
    charges || 0,
    description || null,
    photos ? JSON.stringify(photos) : null
  );

  res.status(201).json({
    message: "Logement cree avec succes",
    propertyId: result.lastInsertRowid
  });
};

// ============================================
// LISTER mes logements — GET /api/properties/mes-logements
// (réservé au bailleur connecté)
// ============================================
exports.getMyProperties = (req, res) => {
  const bailleur_id = req.user.id;

  const properties = db.prepare(`
    SELECT * FROM properties WHERE bailleur_id = ? ORDER BY date_creation DESC
  `).all(bailleur_id);

  res.json({ properties });
};

// ============================================
// LISTER tous les logements — GET /api/properties
// (public : tout le monde peut voir les logements disponibles)
// ============================================
exports.getAllProperties = (req, res) => {
  const properties = db.prepare(`
    SELECT p.*, u.nom AS bailleur_nom
    FROM properties p
    JOIN users u ON p.bailleur_id = u.id
    WHERE p.statut = 'disponible'
    ORDER BY p.date_creation DESC
  `).all();

  res.json({ properties });
};

// ============================================
// VOIR un logement précis — GET /api/properties/:id
// ============================================
exports.getPropertyById = (req, res) => {
  const { id } = req.params;

  const property = db.prepare(`
    SELECT p.*, u.nom AS bailleur_nom, u.telephone AS bailleur_telephone
    FROM properties p
    JOIN users u ON p.bailleur_id = u.id
    WHERE p.id = ?
  `).get(id);

  if (!property) {
    return res.status(404).json({ message: "Logement introuvable" });
  }

  res.json({ property });
};

// ============================================
// MODIFIER un logement — PUT /api/properties/:id
// (réservé au bailleur propriétaire)
// ============================================
exports.updateProperty = (req, res) => {
  const { id } = req.params;
  const bailleur_id = req.user.id;
  const { titre, adresse, ville, loyer, charges, description, statut } = req.body;

  // Vérifier que le logement appartient au bailleur
  const property = db.prepare("SELECT * FROM properties WHERE id = ?").get(id);
  if (!property) {
    return res.status(404).json({ message: "Logement introuvable" });
  }
  if (property.bailleur_id !== bailleur_id) {
    return res.status(403).json({ message: "Vous n'etes pas le proprietaire de ce logement" });
  }

  db.prepare(`
    UPDATE properties
    SET titre = ?, adresse = ?, ville = ?, loyer = ?, charges = ?, description = ?, statut = ?
    WHERE id = ?
  `).run(
    titre || property.titre,
    adresse || property.adresse,
    ville || property.ville,
    loyer || property.loyer,
    charges !== undefined ? charges : property.charges,
    description || property.description,
    statut || property.statut,
    id
  );

  res.json({ message: "Logement mis a jour avec succes" });
};

// ============================================
// SUPPRIMER un logement — DELETE /api/properties/:id
// (réservé au bailleur propriétaire)
// ============================================
exports.deleteProperty = (req, res) => {
  const { id } = req.params;
  const bailleur_id = req.user.id;

  const property = db.prepare("SELECT * FROM properties WHERE id = ?").get(id);
  if (!property) {
    return res.status(404).json({ message: "Logement introuvable" });
  }
  if (property.bailleur_id !== bailleur_id) {
    return res.status(403).json({ message: "Vous n'etes pas le proprietaire de ce logement" });
  }

  db.prepare("DELETE FROM properties WHERE id = ?").run(id);

  res.json({ message: "Logement supprime avec succes" });
};

// ============================================
// MES LOGEMENTS LOUÉS — GET /api/properties/mes-locations
// (locataire : retourne ses logements actifs)
// ============================================
exports.getMesLocations = (req, res) => {
  const locataire_id = req.user.id;

  const properties = db.prepare(`
    SELECT p.*,
           c.id AS contract_id,
           c.date_debut, c.date_fin, c.montant_loyer,
           c.statut AS contract_statut,
           b.nom AS bailleur_nom,
           b.email AS bailleur_email,
           b.telephone AS bailleur_telephone
    FROM properties p
    JOIN contracts c ON c.property_id = p.id
    JOIN users b ON p.bailleur_id = b.id
    WHERE c.locataire_id = ? AND c.statut = 'actif'
    ORDER BY c.date_creation DESC
  `).all(locataire_id);

  res.json({ properties });
};