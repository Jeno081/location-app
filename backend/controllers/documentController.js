// ============================================
// documentController.js — Pièces d'identité
// ============================================

const db = require("../database/db");
const fs = require("fs");
const { resolveStoredPath } = require("../utils/files");

const TYPES = ["cni", "passeport", "fiche_paie", "autre"];

exports.uploadDocument = (req, res) => {
  const { type } = req.body;
  const locataire_id = req.user.id;

  if (!req.file) return res.status(400).json({ message: "Aucun fichier envoyé" });

  if (!TYPES.includes(type)) {
    try { fs.unlinkSync(req.file.path); } catch (err) { /* ignoré */ }
    return res.status(400).json({ message: "Type de document invalide" });
  }

  const chemin = `/uploads/documents/${req.file.filename}`;

  try {
    const result = db.prepare(`
      INSERT INTO documents (locataire_id, type, nom_fichier, chemin)
      VALUES (?, ?, ?, ?)
    `).run(locataire_id, type, req.file.originalname.slice(0, 255), chemin);

    res.status(201).json({ message: "Document uploadé avec succès", documentId: result.lastInsertRowid });
  } catch (err) {
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignoré */ }
    throw err;
  }
};

exports.getMesDocuments = (req, res) => {
  const documents = db.prepare(`
    SELECT * FROM documents WHERE locataire_id = ? ORDER BY date_upload DESC
  `).all(req.user.id);
  res.json({ documents });
};

exports.getDocumentsLocataire = (req, res) => {
  const { id } = req.params;
  const lien = db.prepare(`
    SELECT c.id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ? AND p.bailleur_id = ?
    LIMIT 1
  `).get(id, req.user.id);

  if (!lien) return res.status(403).json({ message: "Non autorisé" });

  const documents = db.prepare(`
    SELECT d.*, u.nom AS locataire_nom, u.email AS locataire_email
    FROM documents d
    JOIN users u ON d.locataire_id = u.id
    WHERE d.locataire_id = ?
    ORDER BY d.date_upload DESC
  `).all(id);
  res.json({ documents });
};

exports.updateDocumentStatus = (req, res) => {
  const { statut, commentaire } = req.body;
  if (!["en_attente", "valide", "refuse"].includes(statut)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  const doc = db.prepare(`
    SELECT d.* FROM documents d
    JOIN contracts c ON c.locataire_id = d.locataire_id
    JOIN properties p ON c.property_id = p.id
    WHERE d.id = ? AND p.bailleur_id = ?
    LIMIT 1
  `).get(req.params.id, req.user.id);

  if (!doc) return res.status(404).json({ message: "Document introuvable" });

  db.prepare("UPDATE documents SET statut = ?, commentaire = ? WHERE id = ?")
    .run(statut, commentaire ? String(commentaire).slice(0, 500) : null, req.params.id);
  res.json({ message: "Statut mis à jour" });
};

exports.deleteDocument = (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;

  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  if (!doc) return res.status(404).json({ message: "Document introuvable" });

  let autorise = role === "locataire" && doc.locataire_id === userId;
  if (role === "bailleur") {
    const lien = db.prepare(`
      SELECT c.id FROM contracts c
      JOIN properties p ON c.property_id = p.id
      WHERE c.locataire_id = ? AND p.bailleur_id = ?
      LIMIT 1
    `).get(doc.locataire_id, userId);
    if (lien) autorise = true;
  }
  if (!autorise) return res.status(403).json({ message: "Non autorisé" });

  const filePath = resolveStoredPath(doc.chemin);
  if (filePath) {
    try { fs.unlinkSync(filePath); } catch (err) { /* ignoré */ }
  }
  db.prepare("DELETE FROM documents WHERE id = ?").run(id);
  res.json({ message: "Document supprimé" });
};

exports.getDocumentFile = (req, res) => {
  const { id } = req.params;
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  if (!doc) return res.status(404).json({ message: "Document introuvable" });

  let autorise = req.user.role === "locataire" && doc.locataire_id === req.user.id;
  if (req.user.role === "bailleur") {
    const lien = db.prepare(`
      SELECT c.id FROM contracts c
      JOIN properties p ON c.property_id = p.id
      WHERE c.locataire_id = ? AND p.bailleur_id = ?
      LIMIT 1
    `).get(doc.locataire_id, req.user.id);
    if (lien) autorise = true;
  }
  if (!autorise) return res.status(403).json({ message: "Non autorisé" });

  const filePath = resolveStoredPath(doc.chemin);
  if (!filePath) return res.status(404).json({ message: "Fichier introuvable" });

  res.setHeader("Cache-Control", "private, max-age=0");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.nom_fichier)}"`);
  res.sendFile(filePath);
};
