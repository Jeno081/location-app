// ============================================
// notificationController.js — Compteurs pour badges
// ============================================

const db = require("../database/db");

// ============================================
// LOCATAIRE — GET /api/notifications/locataire
// ============================================
exports.getNotificationsLocataire = (req, res) => {
  const locataire_id = req.user.id;

  // 1. Rappels non lus
  const rappels = db.prepare(`
    SELECT COUNT(*) AS nb
    FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    WHERE c.locataire_id = ? AND r.statut = 'envoye'
  `).get(locataire_id).nb;

  // 2. Incidents non résolus
  const incidents = db.prepare(`
    SELECT COUNT(*) AS nb
    FROM incidents
    WHERE locataire_id = ? AND statut != 'resolu'
  `).get(locataire_id).nb;

  // 3. Paiement du mois en attente ?
  const maintenant = new Date();
  const moisActuel = maintenant.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisActuelCap = moisActuel.charAt(0).toUpperCase() + moisActuel.slice(1);

  const contratsActifs = db.prepare(`
    SELECT id FROM contracts WHERE locataire_id = ? AND statut = 'actif'
  `).all(locataire_id);

  let paiementsEnAttente = 0;
  contratsActifs.forEach(c => {
    const paye = db.prepare(`
      SELECT id FROM payments WHERE contract_id = ? AND mois = ?
    `).get(c.id, moisActuelCap);
    if (!paye) paiementsEnAttente++;
  });

  res.json({
    rappels: rappels,
    incidents: incidents,
    paiements: paiementsEnAttente
  });
};

// ============================================
// BAILLEUR — GET /api/notifications/bailleur
// ============================================
exports.getNotificationsBailleur = (req, res) => {
  const bailleur_id = req.user.id;

  // 1. Incidents non résolus
  const incidents = db.prepare(`
    SELECT COUNT(*) AS nb
    FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE p.bailleur_id = ? AND i.statut != 'resolu'
  `).get(bailleur_id).nb;

  // 2. Contrats en attente de signature
  const contrats = db.prepare(`
    SELECT COUNT(*) AS nb
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND c.statut = 'en_attente'
  `).get(bailleur_id).nb;

  // 3. Locataires en retard
  const maintenant = new Date();
  const moisActuel = maintenant.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisActuelCap = moisActuel.charAt(0).toUpperCase() + moisActuel.slice(1);

  const contratsActifs = db.prepare(`
    SELECT c.id, c.date_debut, c.montant_loyer
    FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND c.statut = 'actif'
  `).all(bailleur_id);

  let retards = 0;
  contratsActifs.forEach(c => {
    const debut = new Date(c.date_debut);
    const moisEcoules = Math.max(0, (maintenant.getFullYear() - debut.getFullYear()) * 12 + (maintenant.getMonth() - debut.getMonth()) + 1);
    const totalPayeMois = db.prepare(`
      SELECT COUNT(DISTINCT mois) AS nb FROM payments WHERE contract_id = ?
    `).get(c.id).nb;
    if (moisEcoules - totalPayeMois >= 1) retards++;
  });

  res.json({
    incidents: incidents,
    contrats: contrats,
    paiements: retards
  });
};
