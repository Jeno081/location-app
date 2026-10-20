// ============================================
// historyController.js — Historique complet du locataire
// ============================================

const db = require("../database/db");

exports.getMyHistory = async (req, res) => {
  const locataire_id = req.user.id;

  // 1. Tous les contrats (anciens + actuels)
  const contrats = await db.all(`
    SELECT c.id, c.date_debut, c.date_fin, c.montant_loyer, c.statut,
           c.signature_bailleur, c.signature_locataire,
           c.date_terminaison, c.motif_terminaison,
           c.date_creation,
           p.titre AS property_titre, p.adresse AS property_adresse, p.ville AS property_ville,
           b.nom AS bailleur_nom
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    JOIN users b ON p.bailleur_id = b.id
    WHERE c.locataire_id = ?
    ORDER BY c.date_creation DESC
  `, [locataire_id]);

  // 2. Tous les paiements
  const paiements = await db.all(`
    SELECT pay.id, pay.montant, pay.mois, pay.methode, pay.statut, pay.date_paiement,
           p.titre AS property_titre
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE c.locataire_id = ?
    ORDER BY pay.date_paiement DESC
  `, [locataire_id]);

  // 3. Tous les incidents
  const incidents = await db.all(`
    SELECT i.id, i.description, i.photo, i.statut, i.date_creation,
           p.titre AS property_titre
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE i.locataire_id = ?
    ORDER BY i.date_creation DESC
  `, [locataire_id]);

  // 4. Tous les documents
  const documents = await db.all(`
    SELECT id, type, nom_fichier, chemin, statut, commentaire, date_upload
    FROM documents
    WHERE locataire_id = ?
    ORDER BY date_upload DESC
  `, [locataire_id]);

  // 5. Statistiques globales
  const stats = {
    nb_contrats: contrats.length,
    nb_contrats_actifs: contrats.filter(c => c.statut === "actif").length,
    nb_contrats_termines: contrats.filter(c => c.statut === "termine").length,
    total_paye: paiements.reduce((s, p) => s + Number(p.montant || 0), 0),
    nb_paiements: paiements.length,
    nb_incidents: incidents.length,
    nb_incidents_resolus: incidents.filter(i => i.statut === "resolu").length,
    nb_documents: documents.length
  };

  res.json({ contrats, paiements, incidents, documents, stats });
};
