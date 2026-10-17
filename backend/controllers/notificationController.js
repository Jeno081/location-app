// ============================================
// notificationController.js
// ============================================

const db = require("../database/db");

exports.getNotificationsLocataire = (req, res) => {
  const locataire_id = req.user.id;

  const rappels = db.prepare(`
    SELECT COUNT(*) AS nb FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    WHERE c.locataire_id = ? AND r.statut = 'envoye'
  `).get(locataire_id).nb;

  const incidents = db.prepare(`
    SELECT COUNT(*) AS nb FROM incidents
    WHERE locataire_id = ? AND statut != 'resolu'
  `).get(locataire_id).nb;

  const maintenant = new Date();
  const moisActuel = maintenant.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisActuelCap = moisActuel.charAt(0).toUpperCase() + moisActuel.slice(1);

  const contratsActifs = db.prepare(`
    SELECT id FROM contracts WHERE locataire_id = ? AND statut = 'actif'
  `).all(locataire_id);

  let paiementsEnAttente = 0;
  contratsActifs.forEach(c => {
    const paye = db.prepare(`
      SELECT id FROM payments WHERE contract_id = ? AND mois = ? AND statut_bailleur = 'valide'
    `).get(c.id, moisActuelCap);
    if (!paye) paiementsEnAttente++;
  });

  res.json({ rappels, incidents, paiements: paiementsEnAttente });
};

exports.getNotificationsBailleur = (req, res) => {
  const bailleur_id = req.user.id;

  const incidents = db.prepare(`
    SELECT COUNT(*) AS nb FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE p.bailleur_id = ? AND i.statut != 'resolu'
  `).get(bailleur_id).nb;

  const contrats = db.prepare(`
    SELECT COUNT(*) AS nb FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND c.statut = 'en_attente'
  `).get(bailleur_id).nb;

  const paiementsAttente = db.prepare(`
    SELECT COUNT(*) AS nb FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND pay.statut_bailleur = 'en_attente'
  `).get(bailleur_id).nb;

  const maintenant = new Date();
  const moisActuel = maintenant.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisActuelCap = moisActuel.charAt(0).toUpperCase() + moisActuel.slice(1);

  const contratsActifs = db.prepare(`
    SELECT c.id, c.date_debut FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND c.statut = 'actif'
  `).all(bailleur_id);

  let retards = 0;
  contratsActifs.forEach(c => {
    const debut = new Date(c.date_debut);
    const moisEcoules = Math.max(0, (maintenant.getFullYear() - debut.getFullYear()) * 12 + (maintenant.getMonth() - debut.getMonth()) + 1);
    const totalPayeMois = db.prepare(`
      SELECT COUNT(DISTINCT mois) AS nb FROM payments WHERE contract_id = ? AND statut_bailleur = 'valide'
    `).get(c.id).nb;
    if (moisEcoules - totalPayeMois >= 1) retards++;
  });

  res.json({
    incidents: incidents,
    contrats: contrats,
    paiements: paiementsAttente,
    retards: retards
  });
};
