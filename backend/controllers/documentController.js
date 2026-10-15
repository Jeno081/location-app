// ============================================
// documentController.js — Pièces d'identité
// ============================================

const db = require("../database/db");
const path = require("path");
const fs = require("fs");

// ============================================
// UPLOAD d'un document — POST /api/documents
// (locataire uniquement)
// ============================================
exports.uploadDocument = (req, res) => {
  const { type } = req.body;
  const locataire_id = req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier envoye" });
  }

  if (!["cni", "passeport", "fiche_paie", "autre"].includes(type)) {
    // Supprimer le fichier en cas de type invalide
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: "Type de document invalide" });
  }

  const chemin = `/uploads/documents/${req.file.filename}`;

  const result = db.prepare(`
    INSERT INTO documents (locataire_id, type, nom_fichier, chemin)
    VALUES (?, ?, ?, ?)
  `).run(locataire_id, type, req.file.originalname, chemin);

  res.status(201).json({
    message: "Document uploade avec succes",
    documentId: result.lastInsertRowid
  });
};

// ============================================
// MES documents — GET /api/documents/mes-documents
// (locataire)
// ============================================
exports.getMesDocuments = (req, res) => {
  const locataire_id = req.user.id;

  const documents = db.prepare(`
    SELECT * FROM documents WHERE locataire_id = ? ORDER BY date_upload DESC
  `).all(locataire_id);

  res.json({ documents });
};

// ============================================
// DOCUMENTS d'un locataire — GET /api/documents/locataire/:id
// (bailleur uniquement)
// ============================================
exports.getDocumentsLocataire = (req, res) => {
  const { id } = req.params;
  const bailleur_id = req.user.id;

  // Vérifier que ce locataire a un contrat avec ce bailleur
  const lien = db.prepare(`
    SELECT c.id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ? AND p.bailleur_id = ?
    LIMIT 1
  `).get(id, bailleur_id);

  if (!lien) {
    return res.status(403).json({ message: "Non autorise" });
  }

  const documents = db.prepare(`
    SELECT d.*, u.nom AS locataire_nom, u.email AS locataire_email
    FROM documents d
    JOIN users u ON d.locataire_id = u.id
    WHERE d.locataire_id = ?
    ORDER BY d.date_upload DESC
  `).all(id);

  res.json({ documents });
};

// ============================================
// METTRE À JOUR le statut — PUT /api/documents/:id/statut
// (bailleur uniquement)
// ============================================
exports.updateDocumentStatus = (req, res) => {
  const { id } = req.params;
  const { statut, commentaire } = req.body;
  const bailleur_id = req.user.id;

  if (!["en_attente", "valide", "refuse"].includes(statut)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  // Vérifier que le document appartient à un locataire du bailleur
  const doc = db.prepare(`
    SELECT d.* FROM documents d
    JOIN contracts c ON c.locataire_id = d.locataire_id
    JOIN properties p ON c.property_id = p.id
    WHERE d.id = ? AND p.bailleur_id = ?
    LIMIT 1
  `).get(id, bailleur_id);

  if (!doc) {
    return res.status(404).json({ message: "Document introuvable" });
  }

  db.prepare("UPDATE documents SET statut = ?, commentaire = ? WHERE id = ?")
    .run(statut, commentaire || null, id);

  res.json({ message: "Statut mis a jour" });
};

// ============================================
// SUPPRIMER un document — DELETE /api/documents/:id
// (locataire propriétaire OU bailleur)
// ============================================
exports.deleteDocument = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  if (!doc) return res.status(404).json({ message: "Document introuvable" });

  // Autorisation : locataire propriétaire OU bailleur lié
  let autorise = false;
  if (role === "locataire" && doc.locataire_id === userId) autorise = true;
  if (role === "bailleur") {
    const lien = db.prepare(`
      SELECT c.id FROM contracts c
      JOIN properties p ON c.property_id = p.id
      WHERE c.locataire_id = ? AND p.bailleur_id = ?
      LIMIT 1
    `).get(doc.locataire_id, userId);
    if (lien) autorise = true;
  }

  if (!autorise) return res.status(403).json({ message: "Non autorise" });

  // Supprimer le fichier physique
  const filePath = path.join(__dirname, "..", doc.chemin.replace("/uploads/", "uploads/"));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare("DELETE FROM documents WHERE id = ?").run(id);

  res.json({ message: "Document supprime" });
};