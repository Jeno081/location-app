// ============================================
// notificationController.js — Badges de notification
// ============================================

const db = require("../database/db");

function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

exports.getNotificationsLocataire = (req, res) => {
  const locataire_id = req.user.id;

  const rappels = db.prepare(`
    SELECT COUNT(*) AS nb FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    WHERE c.locataire_id = ? AND r.date_confirmation IS NULL
  `).get(locataire_id).nb;

  const incidents = db.prepare(`
    SELECT COUNT(*) AS nb FROM incidents
    WHERE locataire_id = ? AND statut != 'resolu'
  `).get(locataire_id).nb;

  const moisCle = currentMonthKey();
  const contratsActifs = db.prepare(`
    SELECT id FROM contracts WHERE locataire_id = ? AND statut = 'actif'
  `).all(locataire_id);

  let paiementsEnAttente = 0;
  const payeStmt = db.prepare(`
    SELECT id FROM payments WHERE contract_id = ? AND mois = ? AND statut_bailleur = 'valide'
  `);
  for (const c of contratsActifs) {
    if (!payeStmt.get(c.id, moisCle)) paiementsEnAttente++;
  }

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

  const now = new Date();
  const contratsActifs = db.prepare(`
    SELECT c.id, c.date_debut FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND c.statut = 'actif'
  `).all(bailleur_id);

  const countPaid = db.prepare(`
    SELECT COUNT(DISTINCT mois) AS nb FROM payments
    WHERE contract_id = ? AND statut_bailleur = 'valide'
  `);

  let retards = 0;
  for (const c of contratsActifs) {
    const [annee, mois] = String(c.date_debut).slice(0, 10).split("-").map(Number);
    const debut = new Date(annee, (mois || 1) - 1, 1);
    const moisEcoules = Math.max(0, (now.getFullYear() - debut.getFullYear()) * 12 + (now.getMonth() - debut.getMonth()) + 1);
    const payes = countPaid.get(c.id).nb;
    if (moisEcoules - payes >= 1) retards++;
  }

  res.json({ incidents, contrats, paiements: paiementsAttente, retards });
};
