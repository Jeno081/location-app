// ============================================
// incidentController.js — Incidents
// ============================================

const db = require("../database/db");
const fs = require("fs");
const { resolveStoredPath } = require("../utils/files");

function unlinkUploaded(files) {
  for (const file of files || []) {
    try { fs.unlinkSync(file.path); } catch (err) { /* ignoré */ }
  }
}

exports.createIncident = (req, res) => {
  const property_id = Number(req.body.property_id);
  const description = String(req.body.description || "").trim();
  const locataire_id = req.user.id;

  if (!property_id || !description) {
    unlinkUploaded(req.files);
    return res.status(400).json({ message: "Logement et description obligatoires" });
  }
  if (description.length > 2000) {
    unlinkUploaded(req.files);
    return res.status(400).json({ message: "Description trop longue (2000 caractères max)." });
  }

  // Un locataire ne peut signaler un problème que dans un logement qu'il loue.
  const contrat = db.prepare(`
    SELECT id FROM contracts
    WHERE property_id = ? AND locataire_id = ? AND statut = 'actif'
    LIMIT 1
  `).get(property_id, locataire_id);

  if (!contrat) {
    unlinkUploaded(req.files);
    return res.status(403).json({ message: "Vous ne louez pas ce logement." });
  }

  const lignes = description.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 10);
  if (lignes.length === 0) {
    unlinkUploaded(req.files);
    return res.status(400).json({ message: "Aucun problème valide" });
  }

  const photos = req.files || [];
  const insert = db.prepare(`
    INSERT INTO incidents (property_id, locataire_id, description, photo)
    VALUES (?, ?, ?, ?)
  `);
  const ids = [];

  const insertMany = db.transaction((items) => {
    items.forEach((item, index) => {
      const photoPath = photos[index] ? "/uploads/documents/" + photos[index].filename : null;
      const result = insert.run(property_id, locataire_id, item, photoPath);
      ids.push(result.lastInsertRowid);
    });
  });
  insertMany(lignes);

  res.status(201).json({
    message: `${lignes.length} incident(s) signalé(s) avec succès`,
    incidentIds: ids,
    count: lignes.length,
    photos_count: photos.length
  });
};

exports.getMyIncidents = (req, res) => {
  const incidents = db.prepare(`
    SELECT i.*, p.titre AS property_titre, p.adresse AS property_adresse
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE i.locataire_id = ?
    ORDER BY i.date_creation DESC
  `).all(req.user.id);
  res.json({ incidents });
};

exports.getIncidentsForBailleur = (req, res) => {
  const incidents = db.prepare(`
    SELECT i.*, p.titre AS property_titre, u.nom AS locataire_nom, u.telephone AS locataire_tel
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    JOIN users u ON i.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY i.date_creation DESC
  `).all(req.user.id);
  res.json({ incidents });
};

exports.updateIncidentStatus = (req, res) => {
  const { statut } = req.body;
  if (!["ouvert", "en_cours", "resolu"].includes(statut)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  const incident = db.prepare(`
    SELECT i.* FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE i.id = ? AND p.bailleur_id = ?
  `).get(req.params.id, req.user.id);

  if (!incident) return res.status(404).json({ message: "Incident introuvable ou non autorisé" });

  db.prepare("UPDATE incidents SET statut = ? WHERE id = ?").run(statut, req.params.id);
  res.json({ message: "Statut mis à jour" });
};

exports.getIncidentPhoto = (req, res) => {
  const incident = db.prepare(`
    SELECT i.photo, i.locataire_id, p.bailleur_id
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!incident) return res.status(404).json({ message: "Incident introuvable" });
  const autorise = (req.user.role === "bailleur" && incident.bailleur_id === req.user.id)
    || (req.user.role === "locataire" && incident.locataire_id === req.user.id);
  if (!autorise) return res.status(403).json({ message: "Non autorisé" });

  const file = resolveStoredPath(incident.photo);
  if (!file) return res.status(404).json({ message: "Aucune photo disponible" });

  res.setHeader("Cache-Control", "private, max-age=0");
  res.sendFile(file);
};
