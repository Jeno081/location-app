// ============================================
// documentController.js — Pièces d'identité
// ============================================

const db = require("../database/db");
const fs = require("fs");
const { sendStoredFile, deleteStoredFiles } = require("../services/fileStore");
const pushService = require("../services/pushService");

const TYPES = ["cni", "passeport", "fiche_paie", "autre"];

exports.uploadDocument = async (req, res) => {
  const { type } = req.body;
  const locataire_id = req.user.id;

  if (!req.file) return res.status(400).json({ message: "Aucun fichier envoyé" });

  if (!TYPES.includes(type)) {
    try { fs.unlinkSync(req.file.path); } catch (err) { /* ignoré */ }
    return res.status(400).json({ message: "Type de document invalide" });
  }

  const chemin = `/uploads/documents/${req.file.filename}`;

  try {
    const result = await db.run(`
      INSERT INTO documents (locataire_id, type, nom_fichier, chemin)
      VALUES (?, ?, ?, ?)
    `, [locataire_id, type, req.file.originalname.slice(0, 255), chemin]);

    res.status(201).json({ message: "Document uploadé avec succès", documentId: result.insertId });

    try {
      const lien = await db.get(`
        SELECT p.bailleur_id
        FROM contracts c JOIN properties p ON c.property_id = p.id
        WHERE c.locataire_id = ?
        ORDER BY (c.statut = 'actif') DESC, c.id DESC LIMIT 1
      `, [locataire_id]);
      if (lien) {
        pushService.sendToUser(lien.bailleur_id, {
          title: "Nouveau document",
          body: `${req.user.nom || "Un locataire"} a envoyé un document.`,
          url: "/bailleur.html#documents",
          tag: `document-${result.insertId}`,
          type: "document"
        }).catch((err) => console.warn("[push] document :", err.message));
      }
    } catch (err) {
      console.warn("[push] document :", err.message);
    }
  } catch (err) {
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignoré */ }
    throw err;
  }
};

exports.getMesDocuments = async (req, res) => {
  const documents = await db.all(`
    SELECT * FROM documents WHERE locataire_id = ? ORDER BY date_upload DESC
  `, [req.user.id]);
  res.json({ documents });
};

exports.getDocumentsLocataire = async (req, res) => {
  const { id } = req.params;
  const lien = await db.get(`
    SELECT c.id FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ? AND p.bailleur_id = ?
    LIMIT 1
  `, [id, req.user.id]);

  if (!lien) return res.status(403).json({ message: "Non autorisé" });

  const documents = await db.all(`
    SELECT d.*, u.nom AS locataire_nom, u.email AS locataire_email
    FROM documents d
    JOIN users u ON d.locataire_id = u.id
    WHERE d.locataire_id = ?
    ORDER BY d.date_upload DESC
  `, [id]);
  res.json({ documents });
};

exports.getDocumentsBailleur = async (req, res) => {
  const documents = await db.all(`
    SELECT d.*, u.nom AS locataire_nom, u.email AS locataire_email
    FROM documents d
    JOIN users u ON u.id = d.locataire_id
    WHERE EXISTS (
      SELECT 1 FROM contracts c
      JOIN properties p ON c.property_id = p.id
      WHERE c.locataire_id = d.locataire_id AND p.bailleur_id = ?
    )
    ORDER BY (d.statut = 'en_attente') DESC, d.date_upload DESC
  `, [req.user.id]);
  res.json({ documents });
};

exports.updateDocumentStatus = async (req, res) => {
  const { statut, commentaire } = req.body;
  if (!["en_attente", "valide", "refuse"].includes(statut)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  const commentaireTexte = commentaire ? String(commentaire).trim().slice(0, 500) : null;
  if (statut === "refuse" && (!commentaireTexte || commentaireTexte.length < 3)) {
    return res.status(400).json({ message: "Merci d'indiquer un motif de refus (3 caractères minimum)." });
  }

  const doc = await db.get(`
    SELECT d.* FROM documents d
    JOIN contracts c ON c.locataire_id = d.locataire_id
    JOIN properties p ON c.property_id = p.id
    WHERE d.id = ? AND p.bailleur_id = ?
    LIMIT 1
  `, [req.params.id, req.user.id]);

  if (!doc) return res.status(404).json({ message: "Document introuvable" });

  await db.run("UPDATE documents SET statut = ?, commentaire = ? WHERE id = ?",
    [statut, commentaireTexte, req.params.id]);
  res.json({ message: "Statut mis à jour" });

  pushService.sendToUser(doc.locataire_id, {
    title: statut === "valide" ? "Document validé" : "Document refusé",
    body: statut === "valide"
      ? "Votre document a été validé par le bailleur."
      : `Votre document a été refusé. ${commentaireTexte || ""}`.trim(),
    url: "/locataire.html#documents",
    tag: `document-${doc.id}`,
    type: "document"
  }).catch((err) => console.warn("[push] décision document :", err.message));
};

exports.deleteDocument = async (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;

  const doc = await db.get("SELECT * FROM documents WHERE id = ?", [id]);
  if (!doc) return res.status(404).json({ message: "Document introuvable" });

  let autorise = role === "locataire" && doc.locataire_id === userId;
  if (role === "bailleur") {
    const lien = await db.get(`
      SELECT c.id FROM contracts c
      JOIN properties p ON c.property_id = p.id
      WHERE c.locataire_id = ? AND p.bailleur_id = ?
      LIMIT 1
    `, [doc.locataire_id, userId]);
    if (lien) autorise = true;
  }
  if (!autorise) return res.status(403).json({ message: "Non autorisé" });

  await deleteStoredFiles([doc.chemin]);
  await db.run("DELETE FROM documents WHERE id = ?", [id]);
  res.json({ message: "Document supprimé" });
};

exports.getDocumentFile = async (req, res) => {
  const { id } = req.params;
  const doc = await db.get("SELECT * FROM documents WHERE id = ?", [id]);
  if (!doc) return res.status(404).json({ message: "Document introuvable" });

  let autorise = req.user.role === "locataire" && doc.locataire_id === req.user.id;
  if (req.user.role === "bailleur") {
    const lien = await db.get(`
      SELECT c.id FROM contracts c
      JOIN properties p ON c.property_id = p.id
      WHERE c.locataire_id = ? AND p.bailleur_id = ?
      LIMIT 1
    `, [doc.locataire_id, req.user.id]);
    if (lien) autorise = true;
  }
  if (!autorise) return res.status(403).json({ message: "Non autorisé" });

  res.setHeader("Cache-Control", "private, max-age=0");
  const sent = await sendStoredFile(res, doc.chemin, { inlineName: doc.nom_fichier });
  if (!sent) return res.status(404).json({ message: "Fichier introuvable" });
};
