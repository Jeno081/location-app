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
  const fichiers = req.files || [];

  if (!property_id || !description) {
    unlinkUploaded(fichiers);
    return res.status(400).json({ message: "Logement et description obligatoires" });
  }
  if (description.length > 2000) {
    unlinkUploaded(fichiers);
    return res.status(400).json({ message: "Description trop longue (2000 caractères max)." });
  }
  if (fichiers.length > 5) {
    unlinkUploaded(fichiers);
    return res.status(400).json({ message: "5 fichiers maximum par signalement." });
  }

  // Un locataire ne peut signaler un problème que dans un logement qu'il loue.
  const contrat = await db.get(`
    SELECT id FROM contracts
    WHERE property_id = ? AND locataire_id = ? AND statut = 'actif'
    LIMIT 1
  `, [property_id, locataire_id]);

  if (!contrat) {
    unlinkUploaded(fichiers);
    return res.status(403).json({ message: "Vous ne louez pas ce logement." });
  }

  const premier = fichiers[0] ? "/uploads/documents/" + fichiers[0].filename : null;

  const incidentId = await db.transaction(async (tx) => {
    const result = await tx.run(`
      INSERT INTO incidents (property_id, locataire_id, description, photo)
      VALUES (?, ?, ?, ?)
    `, [property_id, locataire_id, description, premier]);

    for (const fichier of fichiers) {
      const chemin = "/uploads/documents/" + fichier.filename;
      const type = String(fichier.mimetype || "").startsWith("video/") ? "video" : "image";
      await tx.run(`
        INSERT INTO incident_media (incident_id, path, type) VALUES (?, ?, ?)
      `, [result.insertId, chemin, type]);
    }

    return result.insertId;
  });

  res.status(201).json({
    message: "Signalement envoyé avec succès",
    incidentId,
    count: 1,
    medias_count: fichiers.length
  });
};

async function attacherMedias(incidents) {
  if (incidents.length === 0) return incidents;
  const ids = incidents.map((i) => i.id);
  const placeholders = ids.map(() => "?").join(",");
  const medias = await db.all(`
    SELECT id, incident_id, type FROM incident_media
    WHERE incident_id IN (${placeholders}) ORDER BY id
  `, ids);

  const parIncident = new Map();
  for (const media of medias) {
    if (!parIncident.has(media.incident_id)) parIncident.set(media.incident_id, []);
    parIncident.get(media.incident_id).push({
      id: media.id,
      type: media.type,
      url: `/api/incidents/${media.incident_id}/media/${media.id}`
    });
  }

  for (const incident of incidents) {
    incident.medias = parIncident.get(incident.id) || [];
    if (incident.medias.length === 0 && incident.photo) {
      incident.medias = [{ id: null, type: "image", url: `/api/incidents/${incident.id}/photo` }];
    }
  }
  return incidents;
}

exports.getMyIncidents = async (req, res) => {
  const incidents = await db.all(`
    SELECT i.*, p.titre AS property_titre, p.adresse AS property_adresse
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE i.locataire_id = ?
    ORDER BY i.date_creation DESC
  `, [req.user.id]);
  await attacherMedias(incidents);
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
  await attacherMedias(incidents);
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

exports.getIncidentMedia = async (req, res) => {
  const media = await db.get(`
    SELECT m.path, m.type, i.locataire_id, p.bailleur_id
    FROM incident_media m
    JOIN incidents i ON i.id = m.incident_id
    JOIN properties p ON i.property_id = p.id
    WHERE m.id = ? AND m.incident_id = ?
  `, [req.params.mediaId, req.params.id]);

  if (!media) return res.status(404).json({ message: "Média introuvable" });
  const autorise = (req.user.role === "bailleur" && media.bailleur_id === req.user.id)
    || (req.user.role === "locataire" && media.locataire_id === req.user.id);
  if (!autorise) return res.status(403).json({ message: "Non autorisé" });

  res.setHeader("Cache-Control", "private, max-age=0");
  const sent = await sendStoredFile(res, media.path, { inlineName: `signalement-${media.type}` });
  if (!sent) return res.status(404).json({ message: "Média indisponible" });
};
