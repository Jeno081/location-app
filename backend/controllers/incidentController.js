// ============================================
// incidentController.js — Incidents (avec support multiple + photos multiples)
// ============================================

const db = require("../database/db");
const fs = require("fs");

// ============================================
// CRÉER un ou plusieurs incidents
// POST /api/incidents
// Body : { property_id, description }
// Files : photos[] (optionnel, une par ligne)
// ============================================
exports.createIncident = (req, res) => {
  const { property_id, description } = req.body;
  const locataire_id = req.user.id;

  if (!property_id || !description) {
    if (req.files && req.files.length > 0) {
      req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) {} });
    }
    return res.status(400).json({ message: "Logement et description obligatoires" });
  }

  const lignes = description
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lignes.length === 0) {
    if (req.files && req.files.length > 0) {
      req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) {} });
    }
    return res.status(400).json({ message: "Aucun probleme valide" });
  }

  // Associer les photos aux lignes (dans l'ordre)
  const photos = req.files || [];

  const insert = db.prepare(`
    INSERT INTO incidents (property_id, locataire_id, description, photo)
    VALUES (?, ?, ?, ?)
  `);

  const ids = [];
  const insertMany = db.transaction((items) => {
    items.forEach((item, index) => {
      const photoPath = photos[index] ? "/uploads/documents/" + photos[index].filename : null;
      const r = insert.run(property_id, locataire_id, item, photoPath);
      ids.push(r.lastInsertRowid);
    });
  });

  insertMany(lignes);

  res.status(201).json({
    message: lignes.length + " incident(s) signale(s) avec succes",
    incidentIds: ids,
    count: lignes.length,
    photos_count: photos.length
  });
};

// ============================================
// MES incidents (locataire)
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
// Incidents reçus (bailleur)
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
// Changer le statut (bailleur)
// ============================================
exports.updateIncidentStatus = (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;
  const bailleur_id = req.user.id;

  if (!["ouvert", "en_cours", "resolu"].includes(statut)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  const incident = db.prepare(`
    SELECT i.* FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE i.id = ? AND p.bailleur_id = ?
  `).get(id, bailleur_id);

  if (!incident) return res.status(404).json({ message: "Incident introuvable ou non autorise" });

  db.prepare("UPDATE incidents SET statut = ? WHERE id = ?").run(statut, id);
  res.json({ message: "Statut mis a jour" });
};
