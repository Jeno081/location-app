// ============================================
// incidentController.js — Gestion des incidents
// ============================================

const db = require("../database/db");

// ============================================
// CRÉER un incident — POST /api/incidents
// (locataire uniquement)
// ============================================
exports.createIncident = (req, res) => {
  const { property_id, description } = req.body;
  const locataire_id = req.user.id;

  if (!property_id || !description) {
    return res.status(400).json({ message: "Logement et description obligatoires" });
  }

  const result = db.prepare(`
    INSERT INTO incidents (property_id, locataire_id, description)
    VALUES (?, ?, ?)
  `).run(property_id, locataire_id, description);

  res.status(201).json({
    message: "Incident signale avec succes",
    incidentId: result.lastInsertRowid
  });
};

// ============================================
// LISTER mes incidents — GET /api/incidents/mes-incidents
// (locataire connecté)
// ============================================
exports.getMyIncidents = (req, res) => {
  const locataire_id = req.user.id;

  const incidents = db.prepare(`
    SELECT i.*, p.titre AS property_titre, p.adresse AS property_adresse
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE i.locataire_id = ?
    ORDER BY i.date_creation DESC
  `).all(locataire_id);

  res.json({ incidents });
};

// ============================================
// LISTER les incidents pour un bailleur — GET /api/incidents/recus
// (bailleur connecté : les incidents de ses logements)
// ============================================
exports.getIncidentsForBailleur = (req, res) => {
  const bailleur_id = req.user.id;

  const incidents = db.prepare(`
    SELECT i.*, p.titre AS property_titre, u.nom AS locataire_nom, u.telephone AS locataire_tel
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    JOIN users u ON i.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY i.date_creation DESC
  `).all(bailleur_id);

  res.json({ incidents });
};

// ============================================
// CHANGER le statut — PUT /api/incidents/:id/statut
// (bailleur uniquement)
// ============================================
exports.updateIncidentStatus = (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;
  const bailleur_id = req.user.id;

  if (!["ouvert", "en_cours", "resolu"].includes(statut)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  // Vérifier que l'incident appartient à un logement du bailleur
  const incident = db.prepare(`
    SELECT i.* FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE i.id = ? AND p.bailleur_id = ?
  `).get(id, bailleur_id);

  if (!incident) {
    return res.status(404).json({ message: "Incident introuvable ou non autorise" });
  }

  db.prepare("UPDATE incidents SET statut = ? WHERE id = ?").run(statut, id);

  res.json({ message: "Statut mis a jour" });
};