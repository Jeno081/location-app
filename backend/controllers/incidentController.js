// ============================================
// incidentController.js — Incidents
// ============================================

const db = require("../database/db");
const fs = require("fs");
const { sendStoredFile } = require("../services/fileStore");

function unlinkUploaded(files) {
  for (const file of files || []) {
    try { fs.unlinkSync(file.path); } catch (err) { /* ignoré */ }
  }
}

exports.createIncident = async (req, res) => {
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
  const contrat = await db.get(`
    SELECT id FROM contracts
    WHERE property_id = ? AND locataire_id = ? AND statut = 'actif'
    LIMIT 1
  `, [property_id, locataire_id]);

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
  const ids = [];

  await db.transaction(async (tx) => {
    for (let index = 0; index < lignes.length; index++) {
      const photoPath = photos[index] ? "/uploads/documents/" + photos[index].filename : null;
      const result = await tx.run(`
        INSERT INTO incidents (property_id, locataire_id, description, photo)
        VALUES (?, ?, ?, ?)
      `, [property_id, locataire_id, lignes[index], photoPath]);
      ids.push(result.insertId);
    }
  });

  res.status(201).json({
    message: `${lignes.length} incident(s) signalé(s) avec succès`,
    incidentIds: ids,
    count: lignes.length,
    photos_count: photos.length
  });
};

exports.getMyIncidents = async (req, res) => {
  const incidents = await db.all(`
    SELECT i.*, p.titre AS property_titre, p.adresse AS property_adresse
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE i.locataire_id = ?
    ORDER BY i.date_creation DESC
  `, [req.user.id]);
  res.json({ incidents });
};

exports.getIncidentsForBailleur = async (req, res) => {
  const incidents = await db.all(`
    SELECT i.*, p.titre AS property_titre, u.nom AS locataire_nom, u.telephone AS locataire_tel
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    JOIN users u ON i.locataire_id = u.id
    WHERE p.bailleur_id = ?
    ORDER BY i.date_creation DESC
  `, [req.user.id]);
  res.json({ incidents });
};

exports.updateIncidentStatus = async (req, res) => {
  const { statut } = req.body;
  if (!["ouvert", "en_cours", "resolu"].includes(statut)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  const incident = await db.get(`
    SELECT i.* FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE i.id = ? AND p.bailleur_id = ?
  `, [req.params.id, req.user.id]);

  if (!incident) return res.status(404).json({ message: "Incident introuvable ou non autorisé" });

  await db.run("UPDATE incidents SET statut = ? WHERE id = ?", [statut, req.params.id]);
  res.json({ message: "Statut mis à jour" });
};

exports.getIncidentPhoto = async (req, res) => {
  const incident = await db.get(`
    SELECT i.photo, i.locataire_id, p.bailleur_id
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE i.id = ?
  `, [req.params.id]);

  if (!incident) return res.status(404).json({ message: "Incident introuvable" });
  const autorise = (req.user.role === "bailleur" && incident.bailleur_id === req.user.id)
    || (req.user.role === "locataire" && incident.locataire_id === req.user.id);
  if (!autorise) return res.status(403).json({ message: "Non autorisé" });

  res.setHeader("Cache-Control", "private, max-age=0");
  const sent = await sendStoredFile(res, incident.photo, { inlineName: "photo-signalement" });
  if (!sent) return res.status(404).json({ message: "Aucune photo disponible" });
};
