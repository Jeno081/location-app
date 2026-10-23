// ============================================
// notificationController.js — Badges de notification
// ============================================

const db = require("../database/db");

function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

exports.getNotificationsLocataire = async (req, res) => {
  const locataire_id = req.user.id;

  const rappels = await db.get(`
    SELECT COUNT(*) AS nb FROM reminders r
    JOIN contracts c ON r.contract_id = c.id
    WHERE c.locataire_id = ? AND r.date_confirmation IS NULL
  `, [locataire_id]);

  const incidents = await db.get(`
    SELECT COUNT(*) AS nb FROM incidents
    WHERE locataire_id = ? AND statut != 'resolu'
  `, [locataire_id]);

  const moisCle = currentMonthKey();
  const contratsActifs = await db.all(`
    SELECT c.id FROM contracts c WHERE c.locataire_id = ? AND c.statut = 'actif'
  `, [locataire_id]);

  let paiementsEnAttente = 0;
  if (contratsActifs.length > 0) {
    const payes = await db.all(`
      SELECT contract_id FROM payments
      WHERE mois = ? AND statut_bailleur = 'valide'
        AND contract_id IN (${contratsActifs.map(() => "?").join(",")})
    `, [moisCle, ...contratsActifs.map((c) => c.id)]);
    const payesSet = new Set(payes.map((p) => p.contract_id));
    paiementsEnAttente = contratsActifs.filter((c) => !payesSet.has(c.id)).length;
  }

  // Paiements refusés qui n'ont pas encore été remplacés par une nouvelle déclaration.
  const refuses = await db.get(`
    SELECT COUNT(*) AS nb FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    WHERE c.locataire_id = ? AND pay.statut_bailleur = 'refuse'
      AND NOT EXISTS (
        SELECT 1 FROM payments p2
        WHERE p2.contract_id = pay.contract_id AND p2.mois = pay.mois
          AND p2.statut_bailleur <> 'refuse'
      )
  `, [locataire_id]);

  const messages = await db.get(`
    SELECT COUNT(*) AS nb
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.locataire_id = ? AND m.sender_id <> ? AND m.lu = 0
  `, [locataire_id, locataire_id]);

  res.json({
    rappels: Number(rappels.nb),
    incidents: Number(incidents.nb),
    paiements: paiementsEnAttente,
    paiements_refuses: Number(refuses.nb),
    messages: Number(messages.nb)
  });
};

exports.getNotificationsBailleur = async (req, res) => {
  const bailleur_id = req.user.id;

  const incidents = await db.get(`
    SELECT COUNT(*) AS nb FROM incidents i
    JOIN properties p ON i.property_id = p.id
    WHERE p.bailleur_id = ? AND i.statut != 'resolu'
  `, [bailleur_id]);

  const contrats = await db.get(`
    SELECT COUNT(*) AS nb FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND c.statut = 'en_attente'
  `, [bailleur_id]);

  const paiementsAttente = await db.get(`
    SELECT COUNT(*) AS nb FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND pay.statut_bailleur = 'en_attente'
  `, [bailleur_id]);

  const now = new Date();
  const contratsActifs = await db.all(`
    SELECT c.id, c.date_debut FROM contracts c
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND c.statut = 'actif'
  `, [bailleur_id]);

  const paiements = await db.all(`
    SELECT pay.contract_id, COUNT(DISTINCT pay.mois) AS nb
    FROM payments pay
    JOIN contracts c ON pay.contract_id = c.id
    JOIN properties p ON c.property_id = p.id
    WHERE p.bailleur_id = ? AND pay.statut_bailleur = 'valide'
    GROUP BY pay.contract_id
  `, [bailleur_id]);
  const payesParContrat = new Map(paiements.map((p) => [p.contract_id, Number(p.nb)]));

  let retards = 0;
  for (const c of contratsActifs) {
    const [annee, mois] = String(c.date_debut).slice(0, 10).split("-").map(Number);
    const debut = new Date(annee, (mois || 1) - 1, 1);
    const moisEcoules = Math.max(0, (now.getFullYear() - debut.getFullYear()) * 12 + (now.getMonth() - debut.getMonth()) + 1);
    const payes = payesParContrat.get(c.id) || 0;
    if (moisEcoules - payes >= 1) retards++;
  }

  const messages = await db.get(`
    SELECT COUNT(*) AS nb
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.bailleur_id = ? AND m.sender_id <> ? AND m.lu = 0
  `, [bailleur_id, bailleur_id]);

  res.json({
    incidents: Number(incidents.nb),
    contrats: Number(contrats.nb),
    paiements: Number(paiementsAttente.nb),
    retards,
    messages: Number(messages.nb)
  });
};
